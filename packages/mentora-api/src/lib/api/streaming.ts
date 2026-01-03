/**
 * Streaming conversation operations
 *
 * Provides client-side abstractions for real-time Socratic dialogue
 * with Gemini Live integration via WebSocket connections.
 */

import type {
	AudioConfig,
	ClientMessage,
	ConversationSummary,
	ServerMessage,
	StreamingSession,
	TokenUsage
} from 'mentora-firebase';
import { failure, success, type APIResult, type MentoraAPIConfig } from './types.js';

/**
 * Streaming connection state
 */
export type StreamingConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'reconnecting'
	| 'error';

/**
 * Event handlers for streaming session
 */
export interface StreamingEventHandlers {
	/** Called when connection is established */
	onConnected?: (sessionId: string, conversationState: string) => void;
	/** Called when transcription is received */
	onTranscription?: (text: string, isFinal: boolean) => void;
	/** Called when AI starts responding */
	onAIResponseStart?: (strategy?: string) => void;
	/** Called for each AI audio chunk */
	onAIAudioChunk?: (data: string) => void;
	/** Called for each AI text chunk */
	onAITextChunk?: (text: string) => void;
	/** Called when AI response completes */
	onAIResponseEnd?: (turn: { id: string; text: string; type: string }) => void;
	/** Called when conversation state changes */
	onStateChange?: (state: string, reason?: string) => void;
	/** Called when conversation ends */
	onConversationEnded?: (reason: string, summary?: ConversationSummary) => void;
	/** Called with token usage updates */
	onTokenUsage?: (usage: TokenUsage) => void;
	/** Called on errors */
	onError?: (code: string, message: string, recoverable: boolean) => void;
	/** Called when connection state changes */
	onConnectionStateChange?: (state: StreamingConnectionState) => void;
}

/**
 * Streaming session manager
 */
export class StreamingClient {
	private config: MentoraAPIConfig;
	private ws: WebSocket | null = null;
	private conversationId: string;
	private sessionId: string | null = null;
	private handlers: StreamingEventHandlers;
	private connectionState: StreamingConnectionState = 'disconnected';
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 3;
	private reconnectDelay = 1000;
	private audioSequenceNumber = 0;

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
	 * Get current connection state
	 */
	getConnectionState(): StreamingConnectionState {
		return this.connectionState;
	}

	/**
	 * Get session ID if connected
	 */
	getSessionId(): string | null {
		return this.sessionId;
	}

	/**
	 * Connect to streaming endpoint
	 */
	async connect(): Promise<APIResult<void>> {
		if (!this.config.environment.browser) {
			return failure('Streaming is only available in browser environment');
		}

		const currentUser = this.config.getCurrentUser();
		if (!currentUser) {
			return failure('Not authenticated');
		}

		try {
			this.setConnectionState('connecting');

			// Get auth token
			const token = await currentUser.getIdToken();

			// Build WebSocket URL
			const wsProtocol = this.config.backendBaseUrl.startsWith('https') ? 'wss' : 'ws';
			const baseUrl = this.config.backendBaseUrl.replace(/^https?/, wsProtocol);
			const wsUrl = `${baseUrl}/api/conversations/${this.conversationId}/stream?token=${token}`;

			// Create WebSocket connection
			this.ws = new WebSocket(wsUrl);
			this.setupWebSocketHandlers();

			return success(undefined);
		} catch (error) {
			this.setConnectionState('error');
			return failure(error instanceof Error ? error.message : 'Connection failed');
		}
	}

	/**
	 * Disconnect from streaming
	 */
	disconnect(): void {
		if (this.ws) {
			this.ws.close(1000, 'Client disconnect');
			this.ws = null;
		}
		this.setConnectionState('disconnected');
		this.sessionId = null;
		this.reconnectAttempts = 0;
	}

	/**
	 * Start audio streaming
	 */
	startAudio(config: AudioConfig): APIResult<void> {
		if (!this.isConnected()) {
			return failure('Not connected');
		}

		this.audioSequenceNumber = 0;
		this.sendMessage({
			type: 'audio_start',
			config
		});

		return success(undefined);
	}

	/**
	 * Send audio chunk
	 */
	sendAudioChunk(base64Data: string): APIResult<void> {
		if (!this.isConnected()) {
			return failure('Not connected');
		}

		this.sendMessage({
			type: 'audio_chunk',
			data: base64Data,
			sequenceNumber: this.audioSequenceNumber++
		});

		return success(undefined);
	}

	/**
	 * End audio streaming
	 */
	endAudio(): APIResult<void> {
		if (!this.isConnected()) {
			return failure('Not connected');
		}

		this.sendMessage({ type: 'audio_end' });
		return success(undefined);
	}

	/**
	 * Send text input
	 */
	sendText(text: string): APIResult<void> {
		if (!this.isConnected()) {
			return failure('Not connected');
		}

		if (!text.trim()) {
			return failure('Text cannot be empty');
		}

		this.sendMessage({
			type: 'text_input',
			text: text.trim()
		});

		return success(undefined);
	}

	/**
	 * Signal end of user turn
	 */
	endTurn(): APIResult<void> {
		if (!this.isConnected()) {
			return failure('Not connected');
		}

		this.sendMessage({ type: 'end_turn' });
		return success(undefined);
	}

	/**
	 * Stop the streaming session
	 */
	stop(reason?: string): APIResult<void> {
		if (!this.isConnected()) {
			return failure('Not connected');
		}

		this.sendMessage({
			type: 'stop',
			reason
		});

		return success(undefined);
	}

	/**
	 * Send ping to keep connection alive
	 */
	ping(): void {
		if (this.isConnected()) {
			this.sendMessage({ type: 'ping' });
		}
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	/**
	 * Set up WebSocket event handlers
	 */
	private setupWebSocketHandlers(): void {
		if (!this.ws) return;

		this.ws.onopen = () => {
			this.reconnectAttempts = 0;
			// Connection established, waiting for 'connected' message
		};

		this.ws.onmessage = (event) => {
			try {
				const message: ServerMessage = JSON.parse(event.data);
				this.handleServerMessage(message);
			} catch (error) {
				console.error('Failed to parse server message:', error);
			}
		};

		this.ws.onerror = (event) => {
			console.error('WebSocket error:', event);
			this.handlers.onError?.('WEBSOCKET_ERROR', 'Connection error', true);
		};

		this.ws.onclose = (event) => {
			if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
				this.attemptReconnect();
			} else {
				this.setConnectionState('disconnected');
				this.sessionId = null;
			}
		};
	}

	/**
	 * Handle incoming server message
	 */
	private handleServerMessage(message: ServerMessage): void {
		switch (message.type) {
			case 'connected':
				this.sessionId = message.sessionId;
				this.setConnectionState('connected');
				this.handlers.onConnected?.(message.sessionId, message.state);
				break;

			case 'transcription':
				this.handlers.onTranscription?.(message.text, message.isFinal);
				break;

			case 'ai_response_start':
				this.handlers.onAIResponseStart?.(message.strategy);
				break;

			case 'ai_audio_chunk':
				this.handlers.onAIAudioChunk?.(message.data);
				break;

			case 'ai_text_chunk':
				this.handlers.onAITextChunk?.(message.text);
				break;

			case 'ai_response_end':
				this.handlers.onAIResponseEnd?.(message.turn);
				break;

			case 'state_change':
				this.handlers.onStateChange?.(message.state, message.reason);
				break;

			case 'conversation_ended':
				this.handlers.onConversationEnded?.(message.reason, message.summary);
				// Auto-disconnect on conversation end
				this.disconnect();
				break;

			case 'token_usage':
				this.handlers.onTokenUsage?.({
					input: message.inputTokens,
					output: message.outputTokens,
					estimatedCost: message.cost
				});
				break;

			case 'error':
				this.handlers.onError?.(message.code, message.message, message.recoverable);
				if (!message.recoverable) {
					this.disconnect();
				}
				break;

			case 'pong':
				// Heartbeat response, no action needed
				break;
		}
	}

	/**
	 * Attempt to reconnect after disconnect
	 */
	private async attemptReconnect(): Promise<void> {
		this.setConnectionState('reconnecting');
		this.reconnectAttempts++;

		await new Promise((resolve) =>
			setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts)
		);

		await this.connect();
	}

	/**
	 * Update and broadcast connection state
	 */
	private setConnectionState(state: StreamingConnectionState): void {
		this.connectionState = state;
		this.handlers.onConnectionStateChange?.(state);
	}

	/**
	 * Send message to server
	 */
	private sendMessage(message: ClientMessage): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}
}

/**
 * Create a new streaming client for a conversation
 */
export function createStreamingClient(
	config: MentoraAPIConfig,
	conversationId: string,
	handlers: StreamingEventHandlers = {}
): StreamingClient {
	return new StreamingClient(config, conversationId, handlers);
}

/**
 * Get streaming session info via REST
 */
export async function getStreamingSession(
	config: MentoraAPIConfig,
	sessionId: string
): Promise<APIResult<StreamingSession>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	try {
		const token = await currentUser.getIdToken();
		const response = await fetch(`${config.backendBaseUrl}/api/streaming-sessions/${sessionId}`, {
			headers: {
				Authorization: `Bearer ${token}`
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
