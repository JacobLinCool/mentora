import { z } from 'zod';
import { zLedgerEntry, zWallet } from 'mentora-firebase';

/**
 * Join Course Result
 */
export const zJoinCourseResult = z.object({
	courseId: z.string(),
	joined: z.boolean(),
	alreadyMember: z.boolean().optional(),
	rejoined: z.boolean().optional()
});
export type JoinCourseResult = z.infer<typeof zJoinCourseResult>;

/**
 * Add Credits Result
 */
export const zAddCreditsResult = z.object({
	entry: zLedgerEntry,
	newBalance: z.number(),
	message: z.string().optional()
});
export type AddCreditsResult = z.infer<typeof zAddCreditsResult>;

/**
 * Course Wallet with Stats (API Response)
 */
export interface CourseWalletResult {
	wallet: z.infer<typeof zWallet>;
	ledger?: z.infer<typeof zLedgerEntry>[];
	stats: {
		totalCharges: number;
		transactionCount: number;
	};
}

/**
 * LLM Response Structure
 */
export const zLLMResponse = z.object({
	turnId: z.string(),
	text: z.string(),
	analysis: z
		.object({
			stance: z.string().optional(),
			quality: z.number().optional(),
			suggestions: z.array(z.string()).optional()
		})
		.optional(),
	tokenUsage: z
		.object({
			input: z.number(),
			output: z.number()
		})
		.optional()
});
export type LLMResponse = z.infer<typeof zLLMResponse>;

/**
 * Conversation Analysis Result
 */
export const zConversationAnalysis = z.object({
	overallScore: z.number(),
	stanceProgression: z.array(
		z.object({
			turnId: z.string(),
			stance: z.string()
		})
	),
	qualityMetrics: z.object({
		argumentClarity: z.number(),
		evidenceUsage: z.number(),
		criticalThinking: z.number(),
		responseToCounterpoints: z.number()
	}),
	suggestions: z.array(z.string()),
	summary: z.string()
});
export type ConversationAnalysis = z.infer<typeof zConversationAnalysis>;

/**
 * Conversation Summary Result
 */
export const zConversationSummary = z.object({
	text: z.string().describe('The generated summary text.'),
	totalTurns: z.number().int(),
	studentTurns: z.number().int().optional(),
	duration: z.number().nonnegative().describe('Duration in milliseconds'),
	initialStance: z.string().optional(),
	finalStance: z.string().optional(),
	stanceChanged: z.boolean().optional(),
	keyInsights: z.array(z.string()).optional()
});
export type ConversationSummary = z.infer<typeof zConversationSummary>;

/**
 * Voice Transcription Result
 */
export const zTranscriptionResult = z.object({
	text: z.string(),
	confidence: z.number(),
	duration: z.number().optional()
});
export type TranscriptionResult = z.infer<typeof zTranscriptionResult>;

/**
 * Voice Synthesis Result
 */
export const zSynthesizeResult = z.object({
	audioContent: z.string(), // Base64
	contentType: z.string()
});
export type SynthesizeResult = z.infer<typeof zSynthesizeResult>;
