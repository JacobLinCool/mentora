/**
 * Delegated Access Layer - Backend API Operations
 *
 * These operations require server-side processing and are delegated to the backend.
 * The backend handles:
 * - Complex business logic
 * - LLM interactions
 * - Multi-document transactions that need elevated permissions
 * - Third-party service integrations
 *
 * IMPORTANT: The backend does NOT directly manipulate Firebase.
 * It processes data and returns results to the client, which then
 * stores/updates documents via direct Firestore access.
 *
 * This ensures:
 * - Single source of truth for data mutations
 * - Security rules are always enforced
 * - Clear separation of concerns
 */

import type { User } from 'firebase/auth';
import type { Conversation } from 'mentora-firebase';
import { success, failure, type APIResult } from '../types.js';

/**
 * Backend access context
 */
export interface DelegatedAccessContext {
	backendBaseUrl: string;
	getCurrentUser: () => User | null;
}

/**
 * Make an authenticated request to the backend
 */
async function fetchBackend<T>(
	ctx: DelegatedAccessContext,
	endpoint: string,
	options: RequestInit = {}
): Promise<APIResult<T>> {
	const user = ctx.getCurrentUser();
	if (!user) {
		return failure('Not authenticated');
	}

	try {
		const token = await user.getIdToken();
		const response = await fetch(`${ctx.backendBaseUrl}${endpoint}`, {
			...options,
			headers: {
				...options.headers,
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			return failure(errorText || `HTTP ${response.status}`);
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
 * Join a course by code (delegated to backend for validation)
 *
 * This operation requires backend validation:
 * - Verify course exists and is joinable
 * - Check enrollment limits
 * - Handle password-protected courses
 */
export async function joinCourseByCode(
	ctx: DelegatedAccessContext,
	code: string,
	password?: string
): Promise<APIResult<{ courseId: string; joined: boolean; alreadyMember?: boolean }>> {
	return fetchBackend(ctx, '/api/courses/join', {
		method: 'POST',
		body: JSON.stringify({ code, password })
	});
}

// ============ Conversation Operations ============

/**
 * Create a conversation for an assignment (delegated to backend)
 *
 * This operation requires backend processing:
 * - Verify assignment access and timing
 * - Check for existing conversations
 * - Initialize conversation with proper state
 */
export async function createConversation(
	ctx: DelegatedAccessContext,
	assignmentId: string
): Promise<APIResult<{ id: string; state: string; isExisting?: boolean }>> {
	return fetchBackend(ctx, '/api/conversations', {
		method: 'POST',
		body: JSON.stringify({ assignmentId })
	});
}

/**
 * End a conversation (delegated to backend)
 *
 * This operation may trigger:
 * - Submission finalization
 * - Score calculation
 * - Summary generation
 */
export async function endConversation(
	ctx: DelegatedAccessContext,
	conversationId: string
): Promise<APIResult<{ state: string; conversation: Conversation; alreadyClosed?: boolean }>> {
	return fetchBackend(ctx, `/api/conversations/${conversationId}/end`, {
		method: 'POST'
	});
}

// ============ LLM Operations ============

/**
 * Submit a message and trigger AI processing (delegated to backend)
 *
 * This operation triggers the backend to:
 * - Process the message
 * - Generate AI response
 * - Write both user and AI turns to Firestore
 *
 * The client should listen to the Firestore 'turns' collection for updates.
 */
export async function submitMessage(
	ctx: DelegatedAccessContext,
	conversationId: string,
	text: string
): Promise<APIResult<void>> {
	return fetchBackend(ctx, `/api/conversations/${conversationId}/message`, {
		method: 'POST',
		body: JSON.stringify({ text })
	});
}

// Note: Voice operations (transcribe/synthesize) are handled in voice.ts
// which correctly uses the unified /api/voice endpoint.
