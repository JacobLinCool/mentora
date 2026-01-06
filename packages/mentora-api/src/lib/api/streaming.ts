/**
 * Streaming conversation operations
 *
 * Provides client-side abstractions for SSE-based streaming responses.
 * Refactored to match the current backend implementation (SSE POST /api/llm/stream).
 */

import type { TokenUsage } from 'mentora-firebase';
import { failure, success, type APIResult, type MentoraAPIConfig } from './types.js';

/**
 * Event handlers for streaming session
 */
export interface StreamingEventHandlers {
	/** Called when connection is established */
	onConnected?: () => void;
	/** Called for each AI text chunk */
	onAITextChunk?: (text: string) => void;
	/** Called when AI response completes */
	onAIResponseEnd?: (turn: { id: string; text: string }) => void;
	/** Called on errors */
	onError?: (message: string) => void;
	/** Called when response is fully done */
	onDone?: () => void;
}

/**
 * Streaming client for SSE
 */
export class StreamingClient {
	private config: MentoraAPIConfig;
	private conversationId: string;
	private handlers: StreamingEventHandlers;
	private abortController: AbortController | null = null;
	private isStreaming: boolean = false;

	constructor(
		config: MentoraAPIConfig,
		conversationId: string,
		handlers: StreamingEventHandlers = {}
	) {
		this.config = config;
		this.conversationId = conversationId;
		this.handlers = handlers;
	}

	/**
	 * Send text and start streaming response
	 */
	async send(text: string): Promise<APIResult<void>> {
		const currentUser = this.config.getCurrentUser();
		if (!currentUser) {
			return failure('Not authenticated');
		}

		if (this.isStreaming) {
			return failure('Already streaming');
		}

		this.isStreaming = true;
		this.abortController = new AbortController();

		try {
			const token = await currentUser.getIdToken();

			const response = await fetch(
				`${this.config.backendBaseUrl}/api/conversations/${this.conversationId}/stream`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						text
					}),
					signal: this.abortController.signal
				}
			);

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error || `HTTP ${response.status}`);
			}

			if (!response.body) {
				throw new Error('No response body');
			}

			this.handlers.onConnected?.();

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				this.processChunk(chunk);
			}

			this.isStreaming = false;
			this.handlers.onDone?.();
			return success(undefined);
		} catch (error) {
			this.isStreaming = false;
			if (error instanceof Error && error.name === 'AbortError') {
				// Ignore abort
				return success(undefined);
			}
			const msg = error instanceof Error ? error.message : 'Streaming error';
			this.handlers.onError?.(msg);
			return failure(msg);
		}
	}

	/**
	 * Process SSE chunks
	 */
	private processChunk(chunk: string): void {
		const lines = chunk.split('\n');
		for (const line of lines) {
			if (line.startsWith('data: ')) {
				try {
					const data = JSON.parse(line.slice(6));

					if (data.text) {
						this.handlers.onAITextChunk?.(data.text);
					}

					if (data.done) {
						this.handlers.onAIResponseEnd?.({
							id: data.turnId,
							text: data.fullText
						});
					}

					if (data.error) {
						this.handlers.onError?.(data.error);
					}
				} catch (e) {
					console.warn('Failed to parse SSE data:', line);
				}
			}
		}
	}

	/**
	 * Stop the stream
	 */
	stop(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		this.isStreaming = false;
	}
}

/**
 * Create a new streaming client
 */
export function createStreamingClient(
	config: MentoraAPIConfig,
	conversationId: string,
	handlers: StreamingEventHandlers = {}
): StreamingClient {
	return new StreamingClient(config, conversationId, handlers);
}

// Keep the function signature for getStreamingSession, but mark as not implemented/needed for now
// or remove it as it was for WebSocket sessions.
export async function getStreamingSession(
	config: MentoraAPIConfig,
	sessionId: string
): Promise<APIResult<any>> {
	return failure('Not implemented for SSE streaming');
}
