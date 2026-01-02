/**
 * Backend API client
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

		const data = await response.json();
		return success(data);
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Network error');
	}
}

/**
 * Join course by code (backend endpoint)
 */
export async function joinCourseByCode(
	config: MentoraAPIConfig,
	code: string
): Promise<APIResult<string>> {
	return callBackend<string>(config, '/courses/join', {
		method: 'POST',
		body: JSON.stringify({ code })
	});
}
