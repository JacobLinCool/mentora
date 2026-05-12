/**
 * Langfuse v5 OpenTelemetry tracer setup.
 *
 * Sets up a BasicTracerProvider with LangfuseSpanProcessor and registers it
 * via setLangfuseTracerProvider. Returns null if LANGFUSE env vars are missing,
 * so callers can fall back to a no-op observer.
 *
 * Why BasicTracerProvider instead of NodeSDK / @opentelemetry/sdk-node:
 *   The mentora-api package is bundled into apps/mentora and runs on
 *   Cloudflare Workers. @opentelemetry/sdk-node has Node-only dependencies
 *   that don't bundle cleanly for Workers. BasicTracerProvider works in any
 *   JS runtime — Node tests, Workers, and the SvelteKit Vite dev server.
 *
 * Why exportMode "immediate":
 *   Cloudflare Workers terminate the JS event loop as soon as the response
 *   is returned (unless ctx.waitUntil is used). Batching spans means losing
 *   them on shutdown. With "immediate", each span is exported as soon as it
 *   ends — combined with `await flushLangfuse()` in service finally blocks,
 *   this guarantees delivery.
 *
 * Background: langfuse v3 SDK silently fails on Cloudflare Workers
 * (see https://github.com/langfuse/langfuse/issues/11984). v5 uses
 * OpenTelemetry, which works correctly with the Workers fetch runtime.
 */
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { setLangfuseTracerProvider } from '@langfuse/tracing';
import { context as otelContext } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';

let provider: BasicTracerProvider | null = null;
let initialized = false;

/**
 * Explicit Langfuse configuration. When supplied via `initLangfuse`, this is
 * used in preference to `process.env`. Needed for runtimes like the SvelteKit
 * dev server, where `.env` values are exposed only via `$env/dynamic/private`
 * and never copied into `process.env`.
 */
export interface LangfuseConfig {
	publicKey?: string;
	secretKey?: string;
	host?: string;
	environment?: string;
	release?: string;
}

function readEnv(name: string): string | undefined {
	if (typeof process !== 'undefined' && process.env && process.env[name]) {
		return process.env[name];
	}
	return undefined;
}

let contextManagerRegistered = false;

/**
 * Register an async-aware OpenTelemetry context manager. Without this, the
 * default NoopContextManager makes `context.with(ctx, fn)` a no-op — propagated
 * attributes set by Langfuse's `propagateAttributes` (sessionId, userId, …)
 * never reach spans created inside the callback, so trace-level session
 * grouping is lost.
 *
 * `AsyncLocalStorageContextManager` works in Node and Cloudflare Workers (with
 * `nodejs_compat`); `BasicTracerProvider` does not auto-register one, unlike
 * NodeSDK.
 */
function ensureContextManager(): void {
	if (contextManagerRegistered) return;
	contextManagerRegistered = true;
	try {
		const manager = new AsyncLocalStorageContextManager();
		manager.enable();
		otelContext.setGlobalContextManager(manager);
	} catch (err) {
		console.error('[langfuse] failed to register context manager', err);
	}
}

function buildProvider(config: LangfuseConfig): BasicTracerProvider | null {
	if (!config.publicKey || !config.secretKey) return null;

	ensureContextManager();

	const p = new BasicTracerProvider({
		spanProcessors: [
			new LangfuseSpanProcessor({
				publicKey: config.publicKey,
				secretKey: config.secretKey,
				baseUrl: config.host || undefined,
				environment: config.environment || undefined,
				release: config.release || undefined,
				exportMode: 'immediate'
			})
		]
	});

	setLangfuseTracerProvider(p);
	return p;
}

/**
 * Initialize the Langfuse tracer provider. Idempotent — subsequent calls are
 * no-ops. Call once at server boot with explicit config (preferred), or rely
 * on the lazy fallback that reads `process.env` on first `createTrace` call.
 */
export function initLangfuse(config?: LangfuseConfig): void {
	if (initialized) return;
	initialized = true;

	const resolved: LangfuseConfig = config ?? {
		publicKey: readEnv('LANGFUSE_PUBLIC_KEY'),
		secretKey: readEnv('LANGFUSE_SECRET_KEY'),
		host: readEnv('LANGFUSE_HOST') || readEnv('LANGFUSE_BASE_URL'),
		environment: readEnv('LANGFUSE_TRACING_ENVIRONMENT'),
		release: readEnv('LANGFUSE_RELEASE')
	};

	provider = buildProvider(resolved);

	console.log('[langfuse] init', {
		source: config ? 'explicit' : 'process.env',
		hasPublicKey: !!resolved.publicKey,
		hasSecretKey: !!resolved.secretKey,
		host: resolved.host,
		environment: resolved.environment,
		enabled: provider !== null
	});
}

/**
 * Returns the BasicTracerProvider with Langfuse export configured, or null
 * if config is missing (tracing disabled). Triggers lazy `process.env`-based
 * init on first call when `initLangfuse` has not been called explicitly.
 */
export function getLangfuseTracerProvider(): BasicTracerProvider | null {
	if (!initialized) initLangfuse();
	return provider;
}

/**
 * Force-flush any pending spans to Langfuse. MUST be awaited at the end of
 * each top-level request handler in serverless / Workers environments,
 * otherwise the process may shut down before exports complete.
 */
export async function flushLangfuse(): Promise<void> {
	if (!provider) return;
	try {
		await provider.forceFlush();
	} catch (error) {
		console.error('[langfuse] flush failed', error);
	}
}

/**
 * Whether Langfuse tracing is configured (env vars present + initialized).
 */
export function isLangfuseEnabled(): boolean {
	return getLangfuseTracerProvider() !== null;
}
