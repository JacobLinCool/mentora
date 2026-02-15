/**
 * Core types for the Mentora API
 */
import type { Auth, User } from 'firebase/auth';
import type { Firestore, WhereFilterOp } from 'firebase/firestore';
import type { DelegatedListOptions } from '../contracts/api.js';
import type {
	TokenUsageBreakdown as FirebaseTokenUsageBreakdown,
	TokenUsageTotals as FirebaseTokenUsageTotals
} from 'mentora-firebase';

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

const API_ERROR_CODES = new Set<string>(Object.values(APIErrorCode));

/**
 * Result wrapper for API operations
 */
export type APIResult<T> =
	| { success: true; data: T }
	| { success: false; error: string; code?: APIErrorCode };

export type TokenUsageTotals = FirebaseTokenUsageTotals;
export type TokenUsageBreakdown = FirebaseTokenUsageBreakdown & {
	models?: Record<string, string>;
};

export type ListOptions = DelegatedListOptions;

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

function toAPIErrorCode(value: unknown): APIErrorCode | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	return API_ERROR_CODES.has(value) ? (value as APIErrorCode) : undefined;
}

function normalizeError(error: unknown): { message: string; code?: APIErrorCode } {
	if (error instanceof Error) {
		return normalizeError(error.message);
	}

	if (typeof error === 'string') {
		const trimmed = error.trim();
		if (!trimmed) {
			return { message: 'Unknown error' };
		}

		if (
			(trimmed.startsWith('{') && trimmed.endsWith('}')) ||
			(trimmed.startsWith('[') && trimmed.endsWith(']'))
		) {
			try {
				return normalizeError(JSON.parse(trimmed) as unknown);
			} catch {
				// Keep the raw string if parsing fails.
			}
		}

		return { message: trimmed };
	}

	if (typeof error === 'object' && error !== null) {
		const payload = error as {
			code?: unknown;
			error?: unknown;
			message?: unknown;
			status?: unknown;
		};

		const code =
			toAPIErrorCode(payload.code) ??
			toAPIErrorCode(payload.status) ??
			(payload.error &&
			typeof payload.error === 'object' &&
			payload.error !== null &&
			'code' in payload.error
				? toAPIErrorCode((payload.error as { code?: unknown }).code)
				: undefined) ??
			(payload.error &&
			typeof payload.error === 'object' &&
			payload.error !== null &&
			'status' in payload.error
				? toAPIErrorCode((payload.error as { status?: unknown }).status)
				: undefined);

		if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
			return { message: payload.error.trim(), code };
		}

		if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
			return { message: payload.message.trim(), code };
		}

		if (payload.error !== undefined) {
			const nested = normalizeError(payload.error);
			return {
				message: nested.message,
				code: nested.code ?? code
			};
		}

		return {
			message: 'Unknown error',
			code
		};
	}

	return { message: 'Unknown error' };
}

/**
 * Helper to create error result
 */
export function failure<T>(error: unknown, code?: APIErrorCode): APIResult<T> {
	const normalized = normalizeError(error);
	const finalCode = normalized.code ?? code;

	return {
		success: false,
		error: normalized.message,
		...(finalCode && { code: finalCode })
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
		return failure(error instanceof Error ? error.message : 'Unknown error');
	}
}
