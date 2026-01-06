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
import type { Conversation, ConversationSummary, Turn } from 'mentora-firebase';
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
 * LLM response result
 */
export interface LLMResponse {
	text: string;
	turnId: string;
	analysis?: {
		stance?: string;
		quality?: number;
		suggestions?: string[];
	};
	tokenUsage?: {
		input: number;
		output: number;
	};
}

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

/**
 * Submit a message and receive streaming response
 *
 * Returns an EventSource URL for SSE streaming.
 * The client handles the stream and stores the final turn.
 */
export function createStreamingSession(
	ctx: DelegatedAccessContext,
	conversationId: string
): { url: string; getToken: () => Promise<string> } | null {
	const user = ctx.getCurrentUser();
	if (!user) return null;

	return {
		url: `${ctx.backendBaseUrl}/api/conversations/${conversationId}/stream`,
		getToken: () => user.getIdToken()
	};
}

/**
 * Streaming event types
 */
export interface StreamingEvents {
	onStart?: (data: { turnId: string }) => void;
	onChunk?: (data: { text: string }) => void;
	onComplete?: (data: LLMResponse) => void;
	onError?: (error: { code: string; message: string }) => void;
}

/**
 * Submit message with SSE streaming response
 *
 * This function handles the full streaming flow:
 * 1. POST the message
 * 2. Receive SSE events for real-time updates
 * 3. Return the final response
 *
 * NOTE: Backend processes LLM call but client stores the result.
 */
export async function submitMessageWithStreaming(
	ctx: DelegatedAccessContext,
	conversationId: string,
	text: string,
	events?: StreamingEvents
): Promise<APIResult<LLMResponse>> {
	const user = ctx.getCurrentUser();
	if (!user) {
		return failure('Not authenticated');
	}

	try {
		const token = await user.getIdToken();
		const response = await fetch(
			`${ctx.backendBaseUrl}/api/conversations/${conversationId}/stream`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ text })
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			return failure(errorText || `HTTP ${response.status}`);
		}

		// Read SSE stream
		const reader = response.body?.getReader();
		if (!reader) {
			return failure('No response body');
		}

		const decoder = new TextDecoder();
		let buffer = '';
		let finalResponse: LLMResponse | null = null;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				if (line.startsWith('event:')) {
					const eventType = line.substring(6).trim();
					continue;
				}

				if (line.startsWith('data:')) {
					const dataStr = line.substring(5).trim();
					try {
						const data = JSON.parse(dataStr);

						// Handle different event types based on data structure
						if (data.turnId && !data.text) {
							events?.onStart?.(data);
						} else if (data.text && !data.tokenUsage) {
							events?.onChunk?.(data);
						} else if (data.tokenUsage) {
							finalResponse = data;
							events?.onComplete?.(data);
						} else if (data.code || data.message) {
							events?.onError?.(data);
						}
					} catch {
						// Ignore parse errors
					}
				}
			}
		}

		if (finalResponse) {
			return success(finalResponse);
		}

		return failure('Stream ended without completion');
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Streaming error');
	}
}

// ============ Analysis Operations ============

/**
 * Conversation analysis result
 */
export interface ConversationAnalysis {
	overallScore: number;
	stanceProgression: Array<{ turnId: string; stance: string }>;
	qualityMetrics: {
		argumentClarity: number;
		evidenceUsage: number;
		criticalThinking: number;
		responseToCounterpoints: number;
	};
	suggestions: string[];
	summary: string;
}

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
 * Transcription result
 */
export interface TranscriptionResult {
	text: string;
	confidence: number;
	duration: number;
}

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
