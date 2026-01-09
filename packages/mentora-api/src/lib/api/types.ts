/**
 * Core types for the Mentora API
 */
import type { Auth, User } from 'firebase/auth';
import type { Firestore, WhereFilterOp } from 'firebase/firestore';

/**
 * Standard error codes for API operations
 */
export enum APIErrorCode {
	NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
	NOT_FOUND = 'NOT_FOUND',
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	ALREADY_EXISTS = 'ALREADY_EXISTS',
	INVALID_INPUT = 'INVALID_INPUT',
	NETWORK_ERROR = 'NETWORK_ERROR',
	UNKNOWN = 'UNKNOWN'
}

/**
 * Result wrapper for API operations
 */
export type APIResult<T> =
	| { success: true; data: T }
	| { success: false; error: string; code?: APIErrorCode };

/**
 * Query options for list operations
 */
export interface QueryOptions {
	limit?: number;
	orderBy?: { field: string; direction?: 'asc' | 'desc' };
	where?: Array<{ field: string; op: WhereFilterOp; value: unknown }>;
	/** Cursor for pagination - document snapshot or field values to start after */
	startAfter?: unknown;
	/** Cursor for pagination - document snapshot or field values to end before */
	endBefore?: unknown;
}

/**
 * Configuration for the Mentora API
 */
export interface MentoraAPIConfig {
	environment: {
		browser: boolean;
	};
	auth: Auth;
	db: Firestore;
	backendBaseUrl: string;
	getCurrentUser: () => User | null;
}

/**
 * Helper to create success result
 */
export function success<T>(data: T): APIResult<T> {
	return { success: true, data };
}

/**
 * Helper to create error result
 */
export function failure<T>(error: string | Error, code?: APIErrorCode): APIResult<T> {
	return {
		success: false,
		error: error instanceof Error ? error.message : error,
		...(code && { code })
	};
}

/**
 * Helper to catch errors and convert to APIResult
 */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<APIResult<T>> {
	try {
		const data = await fn();
		return success(data);
	} catch (error) {
		console.error('API Error', error);
		return failure(error instanceof Error ? error.message : 'Unknown error');
	}
}
