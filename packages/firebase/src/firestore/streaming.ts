import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

/**
 * Streaming session states
 */
export const zStreamingSessionState = z
    .union([
        z
            .literal("connecting")
            .describe("Initial connection being established."),
        z.literal("active").describe("Session active and ready."),
        z.literal("user_speaking").describe("User is currently speaking."),
        z.literal("ai_responding").describe("AI is generating a response."),
        z.literal("paused").describe("Session temporarily paused."),
        z.literal("error").describe("Session encountered an error."),
        z.literal("closed").describe("Session has been closed."),
    ])
    .describe("Current state of a streaming session.");
export type StreamingSessionState = z.infer<typeof zStreamingSessionState>;

/**
 * Audio configuration for streaming
 */
export const zAudioConfig = z
    .object({
        inputSampleRate: z
            .number()
            .int()
            .positive()
            .default(16000)
            .describe("Sample rate for input audio in Hz."),
        outputSampleRate: z
            .number()
            .int()
            .positive()
            .default(24000)
            .describe("Sample rate for output audio in Hz."),
        inputEncoding: z
            .union([z.literal("pcm"), z.literal("opus"), z.literal("mp3")])
            .default("pcm")
            .describe("Audio encoding for input."),
        outputEncoding: z
            .union([z.literal("pcm"), z.literal("opus"), z.literal("mp3")])
            .default("pcm")
            .describe("Audio encoding for output."),
        channels: z
            .number()
            .int()
            .positive()
            .max(2)
            .default(1)
            .describe("Number of audio channels."),
        voice: z
            .string()
            .max(64)
            .optional()
            .describe("Voice preset for AI responses."),
    })
    .describe("Audio configuration for streaming sessions.");
export type AudioConfig = z.infer<typeof zAudioConfig>;

/**
 * Token usage tracking
 */
export const zTokenUsage = z
    .object({
        input: z
            .number()
            .int()
            .nonnegative()
            .default(0)
            .describe("Total input tokens consumed."),
        output: z
            .number()
            .int()
            .nonnegative()
            .default(0)
            .describe("Total output tokens generated."),
        estimatedCost: z
            .number()
            .nonnegative()
            .default(0)
            .describe("Estimated cost in USD."),
    })
    .describe("Token usage statistics for a session.");
export type TokenUsage = z.infer<typeof zTokenUsage>;

/**
 * Streaming session document
 */
export const zStreamingSession = z
    .object({
        id: z
            .string()
            .max(128)
            .describe("Unique identifier for the streaming session."),
        conversationId: z
            .string()
            .max(128)
            .describe("Associated conversation ID."),
        userId: z.string().max(128).describe("User who owns this session."),
        state: zStreamingSessionState.describe("Current session state."),
        geminiSessionId: z
            .string()
            .max(256)
            .nullable()
            .default(null)
            .describe("Gemini Live session ID if connected."),
        audioConfig: zAudioConfig
            .nullable()
            .optional()
            .default(null)
            .describe("Audio configuration if voice is enabled."),
        tokenUsage: zTokenUsage
            .default({ input: 0, output: 0, estimatedCost: 0 })
            .describe("Token usage for this session."),
        errorMessage: z
            .string()
            .max(1000)
            .nullable()
            .optional()
            .default(null)
            .describe("Error message if state is 'error'."),
        startedAt: zFirebaseTimestamp.describe("When the session started."),
        lastActivityAt: zFirebaseTimestamp.describe(
            "Timestamp of last activity.",
        ),
        endedAt: zFirebaseTimestamp
            .nullable()
            .optional()
            .default(null)
            .describe("When the session ended, if closed."),
    })
    .describe("Streaming session document for real-time conversations.");
export type StreamingSession = z.infer<typeof zStreamingSession>;

/**
 * Client-to-server WebSocket message types
 */
export const zClientMessageType = z
    .union([
        z.literal("audio_start"),
        z.literal("audio_chunk"),
        z.literal("audio_end"),
        z.literal("text_input"),
        z.literal("end_turn"),
        z.literal("stop"),
        z.literal("ping"),
    ])
    .describe("Type of message sent from client to server.");
export type ClientMessageType = z.infer<typeof zClientMessageType>;

/**
 * Client WebSocket message for starting audio
 */
export const zClientAudioStartMessage = z
    .object({
        type: z.literal("audio_start"),
        config: zAudioConfig.describe("Audio configuration for the session."),
    })
    .describe("Client message to start audio streaming.");
export type ClientAudioStartMessage = z.infer<typeof zClientAudioStartMessage>;

/**
 * Client WebSocket message for audio chunk
 */
export const zClientAudioChunkMessage = z
    .object({
        type: z.literal("audio_chunk"),
        data: z.string().describe("Base64-encoded audio data."),
        sequenceNumber: z
            .number()
            .int()
            .nonnegative()
            .optional()
            .describe("Optional sequence number for ordering."),
    })
    .describe("Client message containing audio data.");
export type ClientAudioChunkMessage = z.infer<typeof zClientAudioChunkMessage>;

/**
 * Client WebSocket message for text input
 */
export const zClientTextInputMessage = z
    .object({
        type: z.literal("text_input"),
        text: z.string().min(1).max(20000).describe("Text input from user."),
    })
    .describe("Client message containing text input.");
export type ClientTextInputMessage = z.infer<typeof zClientTextInputMessage>;

/**
 * Client WebSocket message for ending turn
 */
export const zClientEndTurnMessage = z
    .object({
        type: z.literal("end_turn"),
    })
    .describe("Client message to signal end of user turn.");
export type ClientEndTurnMessage = z.infer<typeof zClientEndTurnMessage>;

/**
 * Client WebSocket message to stop session
 */
export const zClientStopMessage = z
    .object({
        type: z.literal("stop"),
        reason: z
            .string()
            .max(200)
            .optional()
            .describe("Optional stop reason."),
    })
    .describe("Client message to stop the session.");
export type ClientStopMessage = z.infer<typeof zClientStopMessage>;

/**
 * All client message types
 */
export const zClientMessage = z
    .discriminatedUnion("type", [
        zClientAudioStartMessage,
        zClientAudioChunkMessage,
        zClientTextInputMessage,
        zClientEndTurnMessage,
        zClientStopMessage,
        z.object({ type: z.literal("audio_end") }),
        z.object({ type: z.literal("ping") }),
    ])
    .describe("Any client WebSocket message.");
export type ClientMessage = z.infer<typeof zClientMessage>;

/**
 * Server-to-client WebSocket message types
 */
export const zServerMessageType = z
    .union([
        z.literal("connected"),
        z.literal("transcription"),
        z.literal("ai_response_start"),
        z.literal("ai_audio_chunk"),
        z.literal("ai_text_chunk"),
        z.literal("ai_response_end"),
        z.literal("state_change"),
        z.literal("conversation_ended"),
        z.literal("token_usage"),
        z.literal("error"),
        z.literal("pong"),
    ])
    .describe("Type of message sent from server to client.");
export type ServerMessageType = z.infer<typeof zServerMessageType>;

/**
 * Server message for connection established
 */
export const zServerConnectedMessage = z
    .object({
        type: z.literal("connected"),
        sessionId: z.string().describe("Streaming session ID."),
        conversationId: z.string().describe("Conversation ID."),
        state: z.string().describe("Initial conversation state."),
        voiceEnabled: z.boolean().describe("Whether voice is available."),
    })
    .describe("Server message confirming connection.");
export type ServerConnectedMessage = z.infer<typeof zServerConnectedMessage>;

/**
 * Server message for transcription updates
 */
export const zServerTranscriptionMessage = z
    .object({
        type: z.literal("transcription"),
        text: z.string().describe("Transcribed text."),
        isFinal: z
            .boolean()
            .describe("Whether this is the final transcription."),
    })
    .describe("Server message with transcription result.");
export type ServerTranscriptionMessage = z.infer<
    typeof zServerTranscriptionMessage
>;

/**
 * Server message for AI response start
 */
export const zServerAIResponseStartMessage = z
    .object({
        type: z.literal("ai_response_start"),
        strategy: z
            .string()
            .optional()
            .describe("Dialectical strategy being used."),
    })
    .describe("Server message indicating AI response is starting.");
export type ServerAIResponseStartMessage = z.infer<
    typeof zServerAIResponseStartMessage
>;

/**
 * Server message for AI audio chunk
 */
export const zServerAIAudioChunkMessage = z
    .object({
        type: z.literal("ai_audio_chunk"),
        data: z.string().describe("Base64-encoded audio data."),
        sequenceNumber: z
            .number()
            .int()
            .optional()
            .describe("Sequence number."),
    })
    .describe("Server message containing AI audio response.");
export type ServerAIAudioChunkMessage = z.infer<
    typeof zServerAIAudioChunkMessage
>;

/**
 * Server message for AI text chunk
 */
export const zServerAITextChunkMessage = z
    .object({
        type: z.literal("ai_text_chunk"),
        text: z.string().describe("Chunk of AI text response."),
    })
    .describe("Server message containing AI text response chunk.");
export type ServerAITextChunkMessage = z.infer<
    typeof zServerAITextChunkMessage
>;

/**
 * AI response analysis
 */
export const zAIResponseAnalysis = z
    .object({
        stance: z.string().optional().describe("Detected stance of response."),
        strategy: z.string().optional().describe("Strategy used in response."),
        keyPoints: z
            .array(z.string())
            .optional()
            .describe("Key points extracted from response."),
    })
    .describe("Analysis of AI response.");
export type AIResponseAnalysis = z.infer<typeof zAIResponseAnalysis>;

/**
 * Server message for AI response end
 */
export const zServerAIResponseEndMessage = z
    .object({
        type: z.literal("ai_response_end"),
        turn: z
            .object({
                id: z.string().describe("Turn ID."),
                type: z.string().describe("Turn type."),
                text: z.string().describe("Complete response text."),
                analysis: zAIResponseAnalysis
                    .nullable()
                    .optional()
                    .describe("Response analysis."),
            })
            .describe("Complete turn data."),
    })
    .describe("Server message indicating AI response is complete.");
export type ServerAIResponseEndMessage = z.infer<
    typeof zServerAIResponseEndMessage
>;

/**
 * Server message for state change
 */
export const zServerStateChangeMessage = z
    .object({
        type: z.literal("state_change"),
        state: z.string().describe("New conversation state."),
        reason: z.string().optional().describe("Reason for state change."),
    })
    .describe("Server message indicating conversation state change.");
export type ServerStateChangeMessage = z.infer<
    typeof zServerStateChangeMessage
>;

/**
 * Conversation summary
 */
export const zConversationSummary = z
    .object({
        totalTurns: z.number().int().describe("Total number of turns."),
        duration: z.number().describe("Duration in milliseconds."),
        stanceShift: z
            .object({
                initial: z.string().optional(),
                final: z.string().optional(),
            })
            .optional()
            .describe("How the student's stance changed."),
        keyInsights: z
            .array(z.string())
            .optional()
            .describe("Key insights from the conversation."),
    })
    .describe("Summary of a completed conversation.");
export type ConversationSummary = z.infer<typeof zConversationSummary>;

/**
 * Server message for conversation ended
 */
export const zServerConversationEndedMessage = z
    .object({
        type: z.literal("conversation_ended"),
        reason: z.string().describe("Why the conversation ended."),
        summary: zConversationSummary
            .optional()
            .describe("Conversation summary."),
    })
    .describe("Server message indicating conversation has ended.");
export type ServerConversationEndedMessage = z.infer<
    typeof zServerConversationEndedMessage
>;

/**
 * Server message for token usage update
 */
export const zServerTokenUsageMessage = z
    .object({
        type: z.literal("token_usage"),
        inputTokens: z.number().describe("Input tokens used."),
        outputTokens: z.number().describe("Output tokens generated."),
        cost: z.number().describe("Estimated cost in USD."),
    })
    .describe("Server message with token usage update.");
export type ServerTokenUsageMessage = z.infer<typeof zServerTokenUsageMessage>;

/**
 * Server error message
 */
export const zServerErrorMessage = z
    .object({
        type: z.literal("error"),
        code: z.string().describe("Error code."),
        message: z.string().describe("Error message."),
        recoverable: z
            .boolean()
            .default(false)
            .describe("Whether the error is recoverable."),
    })
    .describe("Server message indicating an error.");
export type ServerErrorMessage = z.infer<typeof zServerErrorMessage>;

/**
 * All server message types
 */
export const zServerMessage = z
    .discriminatedUnion("type", [
        zServerConnectedMessage,
        zServerTranscriptionMessage,
        zServerAIResponseStartMessage,
        zServerAIAudioChunkMessage,
        zServerAITextChunkMessage,
        zServerAIResponseEndMessage,
        zServerStateChangeMessage,
        zServerConversationEndedMessage,
        zServerTokenUsageMessage,
        zServerErrorMessage,
        z.object({ type: z.literal("pong") }),
    ])
    .describe("Any server WebSocket message.");
export type ServerMessage = z.infer<typeof zServerMessage>;

/**
 * Streaming session collection helpers
 */
export const StreamingSessions = {
    collectionPath: () => "streamingSessions" as const,
    docPath: (sessionId: string) => joinPath("streamingSessions", sessionId),
    schema: zStreamingSession,
} as const;
