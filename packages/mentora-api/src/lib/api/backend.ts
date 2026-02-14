/**
 * Backend API Client
 *
 * Provides a clean interface for calling backend endpoints (Delegated Access).
 * All operations that require server-side processing go through this module.
 */

import { APIErrorCode, failure, success, type APIResult, type MentoraAPIConfig } from './types.js';

export interface CallBackendOptions {
	allowUnauthenticated?: boolean;
}

function isFormDataBody(body: RequestInit['body']): boolean {
	return typeof FormData !== 'undefined' && body instanceof FormData;
}

function mapStatusToCode(status: number): APIErrorCode | undefined {
	switch (status) {
		case 400:
			return APIErrorCode.INVALID_INPUT;
		case 401:
			return APIErrorCode.NOT_AUTHENTICATED;
		case 403:
			return APIErrorCode.PERMISSION_DENIED;
		case 404:
			return APIErrorCode.NOT_FOUND;
		case 409:
			return APIErrorCode.ALREADY_EXISTS;
		default:
			return undefined;
	}
}

async function readErrorPayload(response: Response): Promise<unknown> {
	const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

	if (contentType.includes('application/json')) {
		try {
			return (await response.json()) as unknown;
		} catch {
			// Fall through to plain text parsing.
		}
	}

	try {
		const text = await response.text();
		if (text.trim().length > 0) {
			return text;
		}
	} catch {
		// Ignore and use HTTP fallback message.
	}

	return `HTTP ${response.status}`;
}

/**
 * Call a backend endpoint with optional authentication
 */
export async function callBackend<T>(
	config: MentoraAPIConfig,
	endpoint: string,
	options: RequestInit = {},
	callOptions?: CallBackendOptions
): Promise<APIResult<T>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser && !callOptions?.allowUnauthenticated) {
		return failure('Not authenticated');
	}

	try {
		const headers = new Headers(options.headers ?? {});
		const hasExplicitContentType = headers.has('Content-Type');
		if (!hasExplicitContentType && options.body !== undefined && !isFormDataBody(options.body)) {
			headers.set('Content-Type', 'application/json');
		}

		if (currentUser) {
			const token = await currentUser.getIdToken();
			headers.set('Authorization', `Bearer ${token}`);
		}

		const response = await fetch(`${config.backendBaseUrl}${endpoint}`, {
			...options,
			headers
		});

		if (!response.ok) {
			const payload = await readErrorPayload(response);
			return failure(payload, mapStatusToCode(response.status));
		}

		if (response.status === 204) {
			return success(undefined as T);
		}

		const data = await response.json();
		return success(data);
	} catch {
		return failure(
			'Unable to connect to the server. Please check your network and try again.',
			APIErrorCode.NETWORK_ERROR
		);
	}
}
