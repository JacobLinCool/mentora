/**
 * Zod schemas for request body validation
 */

import { z } from 'zod';

// ============ Conversations ============

export const CreateConversationSchema = z.object({
	assignmentId: z.string().min(1, 'Assignment ID is required')
});

export const AddTurnSchema = z.object({
	text: z.string().min(1, 'Text is required'),
	type: z.enum(['idea', 'followup']).optional()
});

/**
 * Schema for adding a turn with either text or audio
 * Audio will be stored as blob for later transcription
 */
export const AddTurnWithAudioSchema = z
	.object({
		text: z.string().optional(),
		audio: z.instanceof(Blob).optional(),
		type: z.enum(['idea', 'followup', 'summary', 'counterpoint']).optional().default('idea'),
		// For LLM type distinction: 'user' = human input, 'assistant' = AI response
		turnType: z.enum(['user', 'assistant']).optional().default('user')
	})
	.refine(
		(data) => {
			const hasText = typeof data.text === 'string' && data.text.trim().length > 0;
			const hasAudio = !!data.audio;
			return hasText || hasAudio;
		},
		{
			message: 'Either text or audio is required',
			path: ['text']
		}
	);

// ============ Courses ============

export const CreateCourseSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	code: z.string().optional(),
	visibility: z.enum(['public', 'unlisted', 'private']).optional(),
	theme: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	isDemo: z.boolean().optional(),
	demoPolicy: z
		.object({
			maxFreeCreditsPerUser: z.number(),
			maxTurnsPerConversation: z.number().nullable().default(null)
		})
		.nullable()
		.optional()
});

export const CopyCourseSchema = z.object({
	title: z.string().optional(),
	includeContent: z.boolean().optional(),
	includeRoster: z.boolean().optional(),
	isDemo: z.boolean().optional()
});

export const JoinCourseSchema = z.object({
	code: z.string().min(1, 'Join code is required')
});

// ============ Wallets ============

export const AddCreditsSchema = z.object({
	action: z.literal('addCredits').optional(),
	amount: z.number().positive('Amount must be positive'),
	paymentMethodId: z.string().optional(),
	idempotencyKey: z.string().optional(),
	currency: z.string().optional()
});

// ============ Type exports ============

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type AddTurnInput = z.infer<typeof AddTurnSchema>;
export type AddTurnWithAudioInput = z.infer<typeof AddTurnWithAudioSchema>;
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type CopyCourseInput = z.infer<typeof CopyCourseSchema>;
export type JoinCourseInput = z.infer<typeof JoinCourseSchema>;
export type AddCreditsInput = z.infer<typeof AddCreditsSchema>;
