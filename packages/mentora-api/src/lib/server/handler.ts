/**
 * Mentora Server Handler
 * Framework-agnostic request handler with route registration
 */

import { Firestore } from 'fires2rest';
import { authenticateRequest } from './auth.js';
import {
	errorResponse,
	HttpStatus,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition,
	type RouteHandler,
	type ServerConfig
} from './types.js';
import { allRoutes } from './routes/index.js';

/**
 * Route matcher result
 */
interface RouteMatch {
	route: RouteDefinition;
	params: Record<string, string>;
}

/**
 * Parse URL pattern and extract parameter names
 * Pattern format: "/api/courses/:id/copy" -> ["id"]
 */
function parsePattern(pattern: string): {
	regex: RegExp;
	paramNames: string[];
} {
	const paramNames: string[] = [];
	const regexPattern = pattern.replace(/:([^/]+)/g, (_, paramName) => {
		paramNames.push(paramName);
		return '([^/]+)';
	});
	return {
		regex: new RegExp(`^${regexPattern}$`),
		paramNames
	};
}

/**
 * Match a path against a route pattern
 */
function matchRoute(path: string, pattern: string): Record<string, string> | null {
	const { regex, paramNames } = parsePattern(pattern);
	const match = path.match(regex);
	if (!match) return null;

	const params: Record<string, string> = {};
	paramNames.forEach((name, index) => {
		params[name] = match[index + 1];
	});
	return params;
}

/**
 * Main server handler for Mentora API
 *
 * Provides framework-agnostic routing and request handling.
 * Can be integrated with SvelteKit, Express, Hono, or any other framework.
 */
export class MentoraServerHandler {
	private readonly routes: RouteDefinition[] = [];
	private readonly config: ServerConfig;

	constructor(config: ServerConfig) {
		this.config = config;
	}

	/**
	 * Get the Firestore instance
	 */
	get firestore(): Firestore {
		return this.config.firestore;
	}

	/**
	 * Get the project ID
	 */
	get projectId(): string {
		return this.config.projectId;
	}

	/**
	 * Register a route
	 */
	public register(route: RouteDefinition): this {
		this.routes.push(route);
		return this;
	}

	/**
	 * Register multiple routes
	 */
	public registerAll(routes: RouteDefinition[]): this {
		for (const route of routes) {
			this.register(route);
		}
		return this;
	}

	/**
	 * Register a GET route
	 */
	public get(pattern: string, handler: RouteHandler, options?: { requireAuth?: boolean }): this {
		return this.register({
			method: 'GET',
			pattern,
			handler,
			requireAuth: options?.requireAuth ?? true
		});
	}

	/**
	 * Register a POST route
	 */
	public post(pattern: string, handler: RouteHandler, options?: { requireAuth?: boolean }): this {
		return this.register({
			method: 'POST',
			pattern,
			handler,
			requireAuth: options?.requireAuth ?? true
		});
	}

	/**
	 * Register a PUT route
	 */
	public put(pattern: string, handler: RouteHandler, options?: { requireAuth?: boolean }): this {
		return this.register({
			method: 'PUT',
			pattern,
			handler,
			requireAuth: options?.requireAuth ?? true
		});
	}

	/**
	 * Register a DELETE route
	 */
	public delete(pattern: string, handler: RouteHandler, options?: { requireAuth?: boolean }): this {
		return this.register({
			method: 'DELETE',
			pattern,
			handler,
			requireAuth: options?.requireAuth ?? true
		});
	}

	/**
	 * Find a matching route for a request
	 */
	private findRoute(method: string, path: string): RouteMatch | null {
		for (const route of this.routes) {
			if (route.method !== method) continue;
			const params = matchRoute(path, route.pattern);
			if (params !== null) {
				return { route, params };
			}
		}
		return null;
	}

	/**
	 * Handle an incoming request
	 *
	 * @param path - URL path (e.g., "/api/courses/abc123/copy")
	 * @param request - Standard Request object
	 * @returns Standard Response object
	 */
	public async handle(path: string, request: Request): Promise<Response> {
		const method = request.method;
		const match = this.findRoute(method, path);

		if (!match) {
			return errorResponse('Not Found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
		}

		const { route, params } = match;

		// Authenticate if required
		let user = null;
		// useEmulator requests skipSignatureVerification for Firebase Auth Emulator tokens.
		// auth.ts independently enforces full verification when NODE_ENV=production,
		// so both flags must agree for emulator mode to actually take effect.
		const authOptions = this.config.useEmulator ? { skipSignatureVerification: true } : undefined;

		if (route.requireAuth !== false) {
			user = await authenticateRequest(request, this.config.projectId, authOptions);
			if (!user) {
				return errorResponse(
					'Authentication required',
					HttpStatus.UNAUTHORIZED,
					ServerErrorCode.NOT_AUTHENTICATED
				);
			}
		} else {
			// Optional auth - try to authenticate but don't require it
			user = await authenticateRequest(request, this.config.projectId, authOptions);
		}

		// Parse query string
		const url = new URL(request.url, 'http://localhost');
		const query = url.searchParams;

		// Build route context
		const ctx: RouteContext = {
			firestore: this.config.firestore,
			projectId: this.config.projectId,
			user,
			params,
			query
		};

		// Execute handler with error handling
		try {
			return await route.handler(ctx, request);
		} catch (error) {
			console.error('Route handler error:', error);

			// Check if it's already a Response (e.g., from errorResponse)
			if (error instanceof Response) {
				return error;
			}

			// Handle known error types
			if (error instanceof Error) {
				return errorResponse(
					error.message,
					HttpStatus.INTERNAL_SERVER_ERROR,
					ServerErrorCode.INTERNAL_ERROR
				);
			}

			return errorResponse(
				'Internal server error',
				HttpStatus.INTERNAL_SERVER_ERROR,
				ServerErrorCode.INTERNAL_ERROR
			);
		}
	}
}

/**
 * Create a new server handler instance
 */
export function createServerHandler(config: ServerConfig): MentoraServerHandler {
	const handler = new MentoraServerHandler(config);
	handler.registerAll(allRoutes);
	return handler;
}
