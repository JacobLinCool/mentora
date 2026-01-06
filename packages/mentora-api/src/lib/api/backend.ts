/**
 * Backend API Client
 *
 * Provides a clean interface for calling backend endpoints (Delegated Access).
 * All operations that require server-side processing go through this module.
 */

import type { Conversation } from 'mentora-firebase';
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

// ============ Course Operations ============

/**
 * Join a course by code
 */
export async function joinCourseByCode(
	config: MentoraAPIConfig,
	code: string,
	password?: string
): Promise<APIResult<{ courseId: string; joined: boolean; alreadyMember?: boolean }>> {
	return callBackend(config, '/api/courses/join', {
		method: 'POST',
		body: JSON.stringify({ code, password })
	});
}

// ============ Conversation Operations ============

/**
 * Create a conversation for an assignment
 */
export async function createConversation(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<{ id: string; state: string; isExisting?: boolean }>> {
	return callBackend(config, '/api/conversations', {
		method: 'POST',
		body: JSON.stringify({ assignmentId })
	});
}

/**
 * End a conversation
 */
export async function endConversation(
	config: MentoraAPIConfig,
	conversationId: string
): Promise<APIResult<{ state: string; conversation: Conversation; alreadyClosed?: boolean }>> {
	return callBackend(config, `/api/conversations/${conversationId}/end`, {
		method: 'POST'
	});
}

// ============ LLM Operations ============

/**
 * Submit a message and trigger AI processing
 */
export async function submitMessage(
	config: MentoraAPIConfig,
	conversationId: string,
	text: string
): Promise<APIResult<void>> {
	return callBackend(config, `/api/conversations/${conversationId}/message`, {
		method: 'POST',
		body: JSON.stringify({ text })
	});
}
