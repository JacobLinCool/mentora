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
import type {
	Conversation,
	ConversationSummary,
	LLMResponse,
	ConversationAnalysis,
	TranscriptionResult
} from 'mentora-firebase';
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
 * Submit a message and get AI response (delegated to backend)
 *
 * This operation requires backend processing:
 * - LLM API integration
 * - Response analysis
 * - Token usage tracking
 * - Moderation checks
 *
 * NOTE: The backend returns the generated response data.
 * The client is responsible for storing the turn in Firestore.
 */
export async function submitMessage(
	ctx: DelegatedAccessContext,
	conversationId: string,
	text: string
): Promise<APIResult<LLMResponse>> {
	return fetchBackend(ctx, `/api/conversations/${conversationId}/message`, {
		method: 'POST',
		body: JSON.stringify({ text })
	});
}

// ============ Analysis Operations ============

/**
 * Analyze a conversation (delegated to backend)
 *
 * This operation requires backend LLM processing:
 * - Evaluate conversation quality
 * - Track stance changes
 * - Generate feedback
 *
 * TODO: Integrate with LLM service
 */
export async function analyzeConversation(
	ctx: DelegatedAccessContext,
	conversationId: string
): Promise<APIResult<ConversationAnalysis>> {
	// TODO: Integrate with LLM service for real analysis
	// Currently returns mock data
	return fetchBackend(ctx, `/api/conversations/${conversationId}/analyze`, {
		method: 'POST'
	});
}

/**
 * Generate conversation summary (delegated to backend)
 *
 * TODO: Integrate with LLM service
 */
export async function generateSummary(
	ctx: DelegatedAccessContext,
	conversationId: string
): Promise<APIResult<ConversationSummary>> {
	// TODO: Integrate with LLM service
	return fetchBackend(ctx, `/api/conversations/${conversationId}/summary`, {
		method: 'POST'
	});
}

// ============ Voice Operations ============

/**
 * Transcribe audio (delegated to backend)
 *
 * This operation requires backend processing:
 * - Audio processing
 * - Speech-to-text API integration
 *
 * TODO: Integrate with speech-to-text service
 */
export async function transcribeAudio(
	ctx: DelegatedAccessContext,
	audioBlob: Blob
): Promise<APIResult<TranscriptionResult>> {
	const user = ctx.getCurrentUser();
	if (!user) {
		return failure('Not authenticated');
	}

	try {
		const token = await user.getIdToken();
		const formData = new FormData();
		formData.append('audio', audioBlob);

		const response = await fetch(`${ctx.backendBaseUrl}/api/voice/transcribe`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`
			},
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			return failure(errorText || `HTTP ${response.status}`);
		}

		const data = await response.json();
		return success(data);
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Transcription error');
	}
}

/**
 * Synthesize speech from text (delegated to backend)
 *
 * TODO: Integrate with text-to-speech service
 */
export async function synthesizeSpeech(
	ctx: DelegatedAccessContext,
	text: string,
	voice?: string
): Promise<APIResult<Blob>> {
	const user = ctx.getCurrentUser();
	if (!user) {
		return failure('Not authenticated');
	}

	try {
		const token = await user.getIdToken();
		const response = await fetch(`${ctx.backendBaseUrl}/api/voice/synthesize`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ text, voice })
		});

		if (!response.ok) {
			const errorText = await response.text();
			return failure(errorText || `HTTP ${response.status}`);
		}

		const blob = await response.blob();
		return success(blob);
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Synthesis error');
	}
}
