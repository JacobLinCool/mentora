/**
 * Backend API Client
 *
 * Provides a clean interface for calling backend endpoints (Delegated Access).
 * All operations that require server-side processing go through this module.
 */

import { failure, success, type APIResult, type MentoraAPIConfig } from './types.js';

/**
 * Call a backend endpoint with authentication
 */
export async function callBackend<T>(
	config: MentoraAPIConfig,
	endpoint: string,
	options: RequestInit = {}
): Promise<APIResult<T>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	try {
		const token = await currentUser.getIdToken();
		const response = await fetch(`${config.backendBaseUrl}${endpoint}`, {
			...options,
			headers: {
				...options.headers,
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.text();
			return failure(error || `HTTP ${response.status}`);
		}

		if (response.status === 204) {
			return success(undefined as T);
		}

		const data = await response.json();
		return success(data);
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Network error');
	}
}
