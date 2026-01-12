/**
 * Server-side types for Mentora API
 * Framework-agnostic - works with any HTTP framework
 */

import type { Firestore } from 'fires2rest';

/**
 * Standard error codes matching client-side APIErrorCode
 */
export enum ServerErrorCode {
	NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
	NOT_FOUND = 'NOT_FOUND',
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	ALREADY_EXISTS = 'ALREADY_EXISTS',
	INVALID_INPUT = 'INVALID_INPUT',
	INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Authenticated user context from JWT token
 */
export interface AuthContext {
	uid: string;
	email: string;
	emailVerified: boolean;
	name?: string;
}

/**
 * Server configuration for handlers
 */
export interface ServerConfig {
	firestore: Firestore;
	projectId: string;
	/** Set to true when running against Firebase Emulators (skips JWT signature verification) */
	useEmulator?: boolean;
}

/**
 * Route context passed to handlers
 */
export interface RouteContext {
	/** Firestore instance */
	firestore: Firestore;
	/** Firebase project ID (for JWT verification) */
	projectId: string;
	/** Authenticated user (null if not authenticated) */
	user: AuthContext | null;
	/** URL path parameters (e.g., { id: "abc123" }) */
	params: Record<string, string>;
	/** URL query parameters */
	query: URLSearchParams;
}

/**
 * Route handler function signature
 */
export type RouteHandler = (ctx: RouteContext, request: Request) => Promise<Response>;

/**
 * Route definition
 */
export interface RouteDefinition {
	/** HTTP method */
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** URL pattern (e.g., "/api/courses/:id/copy") */
	pattern: string;
	/** Handler function */
	handler: RouteHandler;
	/** Whether authentication is required (default: true) */
	requireAuth?: boolean;
}

/**
 * Standard API response structure
 */
export interface APIResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	code?: ServerErrorCode;
}

/**
 * Create a successful JSON response
 */
export function jsonResponse<T>(data: T, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * Create an error response
 */
export function errorResponse(message: string, status = 400, code?: ServerErrorCode): Response {
	const body: APIResponse = {
		success: false,
		error: message,
		...(code && { code })
	};
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * HTTP status helpers
 */
export const HttpStatus = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	INTERNAL_SERVER_ERROR: 500
} as const;
