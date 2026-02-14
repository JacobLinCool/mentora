/**
 * Zod schemas for request body validation
 */

import { z } from 'zod';
import type { AddCreditsInput as ContractAddCreditsInput } from '../../contracts/api.js';

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

// ============ Assignments ============

export const GenerateContentSchema = z.object({
	question: z.string().min(1, 'Question is required').max(2000, 'Question is too long')
});

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

export const AddCreditsSchema: z.ZodType<ContractAddCreditsInput> = z.object({
	amount: z.number().positive('Amount must be positive'),
	idempotencyKey: z.string().min(1, 'idempotencyKey is required'),
	paymentRef: z.string().min(1).max(256).nullable().optional().default(null)
});

// ============ Type exports ============

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type AddTurnInput = z.infer<typeof AddTurnSchema>;
export type AddTurnWithAudioInput = z.infer<typeof AddTurnWithAudioSchema>;
export type GenerateContentInput = z.infer<typeof GenerateContentSchema>;
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type CopyCourseInput = z.infer<typeof CopyCourseSchema>;
export type JoinCourseInput = z.infer<typeof JoinCourseSchema>;
export type AddCreditsInput = ContractAddCreditsInput;
