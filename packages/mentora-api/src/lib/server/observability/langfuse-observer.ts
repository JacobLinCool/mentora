/**
 * Adapter mapping mentora-ai's framework-agnostic LLMObserver/LLMSpan/LLMGeneration
 * interfaces onto Langfuse v5 (@langfuse/tracing) which is built on OpenTelemetry.
 *
 * Usage:
 *   const trace = createTrace('conversation.addTurn', {
 *     userId, sessionId, tags: ['conversation'], metadata: { ... }
 *   });
 *   try {
 *     await trace.run(async (rootSpan) => {
 *       // pass `rootSpan` down into orchestrator / executors
 *     });
 *   } finally {
 *     await flushLangfuse();
 *   }
 *
 * If Langfuse is not configured (env vars missing), createTrace returns a
 * no-op TraceHandle and observer calls become no-ops.
 */
import {
	NoopObserver,
	type GenerationStart,
	type LLMGeneration,
	type LLMSpan,
	type SpanAttrs,
	type TokenUsage
} from 'mentora-ai';
import {
	LangfuseGeneration,
	LangfuseSpan,
	propagateAttributes,
	startObservation
} from '@langfuse/tracing';
import { getLangfuseTracerProvider, isLangfuseEnabled } from './langfuse.js';

function tokenUsageToLangfuse(
	usage: TokenUsage | undefined
): { input: number; output: number; total: number } | undefined {
	if (!usage) return undefined;
	const input = usage.promptTokenCount ?? 0;
	const output = usage.candidatesTokenCount ?? 0;
	const total = usage.totalTokenCount ?? input + output + (usage.thoughtsTokenCount ?? 0);
	if (input === 0 && output === 0 && total === 0) return undefined;
	return { input, output, total };
}

function cleanMetadata(attrs?: SpanAttrs): Record<string, unknown> | undefined {
	if (!attrs) return undefined;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(attrs)) {
		if (value !== undefined && value !== null) out[key] = value;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

function serializeError(err: unknown): string {
	if (err instanceof Error) return err.message;
	try {
		return JSON.stringify(err);
	} catch {
		return String(err);
	}
}

class LangfuseGenerationAdapter implements LLMGeneration {
	constructor(private readonly generation: LangfuseGeneration) {}

	end(opts: { output?: unknown; usage?: TokenUsage; model?: string; error?: unknown }): void {
		try {
			const usageDetails = tokenUsageToLangfuse(opts.usage);
			this.generation.update({
				output: opts.output,
				model: opts.model,
				usageDetails,
				level: opts.error ? 'ERROR' : undefined,
				statusMessage: opts.error ? serializeError(opts.error) : undefined
			});
			this.generation.end();
		} catch (err) {
			console.error('[langfuse-observer] generation.end failed', err);
		}
	}
}

class LangfuseSpanAdapter implements LLMSpan {
	constructor(private readonly span: LangfuseSpan) {}

	private parentContext() {
		return this.span.otelSpan.spanContext();
	}

	child(name: string, attrs?: SpanAttrs): LLMSpan {
		try {
			const child = startObservation(
				name,
				{ metadata: cleanMetadata(attrs) },
				{ asType: 'span', parentSpanContext: this.parentContext() }
			);
			return new LangfuseSpanAdapter(child);
		} catch (err) {
			console.error('[langfuse-observer] child failed', err);
			return NoopObserver.startSpan(name);
		}
	}

	generation(name: string, opts: GenerationStart): LLMGeneration {
		try {
			const generation = startObservation(
				name,
				{
					model: opts.model,
					input: opts.input,
					metadata: cleanMetadata(opts.metadata)
				},
				{ asType: 'generation', parentSpanContext: this.parentContext() }
			);
			return new LangfuseGenerationAdapter(generation);
		} catch (err) {
			console.error('[langfuse-observer] generation failed', err);
			return { end: () => {} };
		}
	}

	setAttributes(attrs: SpanAttrs): void {
		const meta = cleanMetadata(attrs);
		if (!meta) return;
		try {
			this.span.update({ metadata: meta });
		} catch (err) {
			console.error('[langfuse-observer] setAttributes failed', err);
		}
	}

	setIO(io: { input?: unknown; output?: unknown }): void {
		try {
			this.span.update({ input: io.input, output: io.output });
		} catch (err) {
			console.error('[langfuse-observer] setIO failed', err);
		}
	}

	end(opts?: { error?: unknown; output?: unknown }): void {
		try {
			if (opts?.output !== undefined || opts?.error) {
				this.span.update({
					output: opts.output,
					level: opts.error ? 'ERROR' : undefined,
					statusMessage: opts.error ? serializeError(opts.error) : undefined
				});
			}
			this.span.end();
		} catch (err) {
			console.error('[langfuse-observer] end failed', err);
		}
	}
}

export interface CreateTraceOptions {
	userId?: string;
	sessionId?: string;
	tags?: string[];
	metadata?: Record<string, string>;
	input?: unknown;
}

export interface TraceHandle {
	/** Run `fn` inside the trace's propagated attribute context. */
	run<T>(fn: (rootSpan: LLMSpan) => Promise<T>): Promise<T>;
}

const NOOP_TRACE: TraceHandle = {
	run: async (fn) => fn(NoopObserver.startSpan('noop'))
};

/**
 * Create a Langfuse trace. The returned handle's `run` method:
 *   1. Calls propagateAttributes() so `userId`, `sessionId`, `tags`,
 *      `metadata`, and `traceName` correlate on every child observation.
 *   2. Starts a root span and passes its LLMSpan adapter to `fn`.
 *   3. Ends the root span when `fn` returns/throws.
 *
 * If Langfuse is not configured, returns a no-op trace.
 */
export function createTrace(name: string, options: CreateTraceOptions = {}): TraceHandle {
	// Initialize the tracer provider lazily on first trace creation.
	getLangfuseTracerProvider();
	const enabled = isLangfuseEnabled();
	console.log('[langfuse] createTrace', {
		name,
		enabled,
		userId: options.userId,
		sessionId: options.sessionId,
		tags: options.tags
	});
	if (!enabled) return NOOP_TRACE;

	return {
		async run<T>(fn: (rootSpan: LLMSpan) => Promise<T>): Promise<T> {
			return propagateAttributes(
				{
					traceName: name,
					userId: options.userId,
					sessionId: options.sessionId,
					tags: options.tags,
					metadata: options.metadata
				},
				async () => {
					const root = startObservation(name, { input: options.input }, { asType: 'span' });
					const adapter = new LangfuseSpanAdapter(root);
					try {
						return await fn(adapter);
					} catch (error) {
						adapter.end({ error });
						throw error;
					} finally {
						root.end();
					}
				}
			);
		}
	};
}
