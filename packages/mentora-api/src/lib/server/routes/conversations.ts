/**
 * Conversation route handlers
 */

import { CreateConversationSchema } from '../llm/schemas.js';
import {
	HttpStatus,
	ServerErrorCode,
	errorResponse,
	jsonResponse,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { createServiceContainer } from '../application/container.js';
import { parseBody, requireAuth, requireParam } from './utils.js';

/**
 * Helper to parse request body
 * Returns either { text: string } or { audioBase64: string; audioMimeType: string }
 */
async function parseMultipartForm(
	request: Request
): Promise<{ text: string } | { audioBase64: string; audioMimeType: string }> {
	const contentType = request.headers.get('content-type') || '';

	if (contentType.includes('application/json')) {
		try {
			const body = await request.json();
			const text = body.text as string | undefined;
			const audioBase64 = body.audioBase64 as string | undefined;
			const audioMimeType = body.audioMimeType as string | undefined;

			if (text !== undefined) {
				if (text.trim().length === 0) {
					throw new Error('Text input cannot be empty');
				}
				return { text: text.trim() };
			}

			if (audioBase64 !== undefined && audioMimeType !== undefined) {
				return { audioBase64, audioMimeType };
			}

			throw new Error('Either text or both audioBase64 and audioMimeType are required');
		} catch (error) {
			if (error instanceof Error) throw error;
			throw new Error('Invalid JSON body');
		}
	}

	if (contentType.includes('multipart/form-data')) {
		try {
			const formData = await request.formData();
			const text = formData.get('text') as string | null;
			const audio = formData.get('audio') as Blob | null;

			if (text && text.trim().length > 0) {
				return { text: text.trim() };
			}

			if (audio) {
				const arrayBuffer = await audio.arrayBuffer();
				const audioBase64 = Buffer.from(arrayBuffer).toString('base64');
				const audioMimeType = audio.type || 'audio/mp3';
				return { audioBase64, audioMimeType };
			}

			throw new Error('Either text or audio is required');
		} catch (error) {
			if (error instanceof Error) throw error;
			throw new Error('Failed to parse form data');
		}
	}

	throw new Error('Content-Type must be application/json or multipart/form-data');
}

/**
 * POST /api/conversations
 * Create a new conversation (or return existing)
 */
async function createConversation(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = await parseBody(request, CreateConversationSchema);
	const { conversationService } = createServiceContainer(ctx);
	const result = await conversationService.createConversation(user, body.assignmentId);
	return jsonResponse(
		{
			id: result.id,
			created: result.created,
			reopened: result.reopened
		},
		result.status
	);
}

/**
 * POST /api/conversations/:id/end
 * End a conversation and finalize submission
 */
async function endConversation(ctx: RouteContext): Promise<Response> {
	const user = requireAuth(ctx);
	const conversationId = requireParam(ctx, 'id');
	const { conversationService } = createServiceContainer(ctx);
	await conversationService.endConversation(user, conversationId);
	return jsonResponse({});
}

/**
 * POST /api/conversations/:id/turns
 * Add a turn to a conversation and trigger AI response via LLM
 */
async function addTurn(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const conversationId = requireParam(ctx, 'id');
	const input = await parseMultipartForm(request);
	const { conversationService } = createServiceContainer(ctx);

	try {
		const result = await conversationService.addTurn(user, conversationId, input);
		return jsonResponse(result, HttpStatus.CREATED);
	} catch (error) {
		if (error instanceof Response) throw error;
		if (error instanceof Error) {
			if (error.message.includes('GOOGLE_GENAI_API_KEY')) {
				return errorResponse(
					'LLM service not configured',
					HttpStatus.INTERNAL_SERVER_ERROR,
					ServerErrorCode.INTERNAL_ERROR
				);
			}
			if (error.message.includes('API quota')) {
				return errorResponse(
					'LLM service rate limited. Please try again later.',
					HttpStatus.INTERNAL_SERVER_ERROR,
					ServerErrorCode.INTERNAL_ERROR
				);
			}
			if (error.message.includes('deadline exceeded') || error.message.includes('timeout')) {
				return errorResponse(
					'LLM request timed out. Please try again.',
					HttpStatus.INTERNAL_SERVER_ERROR,
					ServerErrorCode.INTERNAL_ERROR
				);
			}
		}

		return errorResponse(
			'Failed to process your input. Please try again.',
			HttpStatus.INTERNAL_SERVER_ERROR,
			ServerErrorCode.INTERNAL_ERROR
		);
	}
}

/**
 * Export route definitions
 */
export const conversationRoutes: RouteDefinition[] = [
	{
		method: 'POST',
		pattern: '/conversations',
		handler: createConversation,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/conversations/:id/end',
		handler: endConversation,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/conversations/:id/turns',
		handler: addTurn,
		requireAuth: true
	}
];

export { addTurn, createConversation, endConversation };
