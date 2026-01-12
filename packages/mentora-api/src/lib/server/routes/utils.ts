/**
 * Route utilities for server handlers
 */

import { ZodError, type ZodSchema } from 'zod';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type AuthContext,
	type RouteContext
} from '../types.js';

/**
 * Parse and validate request body with Zod schema
 *
 * @param request - The incoming request
 * @param schema - Zod schema to validate against
 * @returns Parsed data or throws Response error
 */
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		throw errorResponse('Invalid JSON body', HttpStatus.BAD_REQUEST, ServerErrorCode.INVALID_INPUT);
	}

	try {
		return schema.parse(body);
	} catch (error) {
		if (error instanceof ZodError) {
			const messages = error.issues.map((e: { message: string }) => e.message).join(', ');
			throw errorResponse(messages, HttpStatus.BAD_REQUEST, ServerErrorCode.INVALID_INPUT);
		}
		throw error;
	}
}

/**
 * Require authenticated user in route context
 *
 * @param ctx - Route context
 * @returns AuthContext (throws if not authenticated)
 */
export function requireAuth(ctx: RouteContext): AuthContext {
	if (!ctx.user) {
		throw errorResponse(
			'Authentication required',
			HttpStatus.UNAUTHORIZED,
			ServerErrorCode.NOT_AUTHENTICATED
		);
	}
	return ctx.user;
}

/**
 * Create a success response with data
 */
export { jsonResponse };

/**
 * Create an error response
 */
export { errorResponse };

/**
 * Require a path parameter
 *
 * @param ctx - Route context
 * @param name - Parameter name
 * @returns Parameter value (throws if missing)
 */
export function requireParam(ctx: RouteContext, name: string): string {
	const value = ctx.params[name];
	if (!value) {
		throw errorResponse(
			`${name} is required`,
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}
	return value;
}
