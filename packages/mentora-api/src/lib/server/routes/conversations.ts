/**
 * Conversation route handlers
 */

import {
	Assignments,
	Conversations,
	Courses,
	type Conversation,
	type Turn
} from 'mentora-firebase';
import { CreateConversationSchema, AddTurnWithAudioSchema } from '../schemas.js';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { parseBody, requireAuth, requireParam } from './utils.js';
import { processWithLLM, extractConversationSummary } from '../llm-service.js';
import { randomUUID } from 'crypto';

/**
 * POST /api/conversations
 * Create a new conversation (or return existing)
 *
 * Uses a deterministic document ID based on userId and assignmentId
 * to prevent duplicate conversations from concurrent requests.
 */
async function createConversation(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = await parseBody(request, CreateConversationSchema);
	const { assignmentId } = body;

	// 1. Get Assignment
	const assignmentDoc = await ctx.firestore.doc(Assignments.docPath(assignmentId)).get();

	if (!assignmentDoc.exists) {
		return errorResponse('Assignment not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
	}

	const assignment = Assignments.schema.parse(assignmentDoc.data());

	// 2. Check if started
	if (assignment.startAt > Date.now()) {
		return errorResponse(
			'Assignment has not started yet',
			HttpStatus.FORBIDDEN,
			ServerErrorCode.PERMISSION_DENIED
		);
	}

	// 3. Check enrollment
	if (assignment.courseId) {
		const membershipDoc = await ctx.firestore
			.doc(Courses.roster.docPath(assignment.courseId, user.uid))
			.get();

		if (!membershipDoc.exists) {
			return errorResponse(
				'Not enrolled in this course',
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}

		const membership = Courses.roster.schema.parse(membershipDoc.data());
		if (membership.status !== 'active') {
			return errorResponse(
				'Not enrolled in this course',
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}
	}

	// 4. Use deterministic document ID to prevent duplicates
	const conversationId = `${user.uid}_${assignmentId}`;
	const conversationRef = ctx.firestore.doc(Conversations.docPath(conversationId));

	// 5. Check existing conversation
	const existingDoc = await conversationRef.get();

	if (existingDoc.exists) {
		const data = Conversations.schema.parse(existingDoc.data());
		if (data.state !== 'closed' || assignment.allowResubmit) {
			return jsonResponse({ id: conversationId });
		} else {
			return errorResponse(
				'Conversation completed and resubmission not allowed',
				HttpStatus.CONFLICT,
				ServerErrorCode.ALREADY_EXISTS
			);
		}
	}

	// 6. Create new conversation with deterministic ID
	const now = Date.now();

	const conversation: Conversation = {
		assignmentId,
		userId: user.uid,
		state: 'awaiting_idea',
		lastActionAt: now,
		createdAt: now,
		updatedAt: now,
		turns: []
	};

	const validated = Conversations.schema.parse(conversation);
	await conversationRef.set(validated);

	return jsonResponse({ id: conversationId }, HttpStatus.CREATED);
}

/**
 * POST /api/conversations/:id/end
 * End a conversation and finalize submission
 */
async function endConversation(ctx: RouteContext): Promise<Response> {
	const user = requireAuth(ctx);
	const conversationId = requireParam(ctx, 'id');

	// Get conversation
	const conversationRef = ctx.firestore.doc(Conversations.docPath(conversationId));
	const conversationDoc = await conversationRef.get();

	if (!conversationDoc.exists) {
		return errorResponse('Conversation not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
	}

	const conversation = Conversations.schema.parse(conversationDoc.data());

	// Ownership check
	if (conversation.userId !== user.uid) {
		return errorResponse('Not authorized', HttpStatus.FORBIDDEN, ServerErrorCode.PERMISSION_DENIED);
	}

	// Check state
	if (conversation.state === 'closed') {
		return errorResponse(
			'Conversation already closed',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	// Update conversation state
	const now = Date.now();
	await conversationRef.update({
		state: 'closed',
		lastActionAt: now,
		updatedAt: now
	});

	// TODO: Create/update submission when submissions are integrated

	return jsonResponse({});
}

/**
 * Helper to parse multipart form data
 * Returns { text?, audio? } depending on what was sent
 */
async function parseMultipartForm(request: Request): Promise<{ text?: string; audio?: Blob }> {
	const contentType = request.headers.get('content-type') || '';

	// Handle JSON (for text input)
	if (contentType.includes('application/json')) {
		try {
			const body = await request.json();
			return { text: body.text };
		} catch {
			throw errorResponse(
				'Invalid JSON body',
				HttpStatus.BAD_REQUEST,
				ServerErrorCode.INVALID_INPUT
			);
		}
	}

	// Handle multipart form data (for audio + optional text)
	if (contentType.includes('multipart/form-data')) {
		try {
			const formData = await request.formData();
			const text = formData.get('text') as string | null;
			const audio = formData.get('audio') as Blob | null;

			if (!text && !audio) {
				throw errorResponse(
					'Either text or audio is required',
					HttpStatus.BAD_REQUEST,
					ServerErrorCode.INVALID_INPUT
				);
			}

			return {
				text: text || undefined,
				audio: audio || undefined
			};
		} catch (error) {
			if (error instanceof Response) throw error;
			throw errorResponse(
				'Failed to parse form data',
				HttpStatus.BAD_REQUEST,
				ServerErrorCode.INVALID_INPUT
			);
		}
	}

	throw errorResponse(
		'Content-Type must be application/json or multipart/form-data',
		HttpStatus.BAD_REQUEST,
		ServerErrorCode.INVALID_INPUT
	);
}

/**
 * POST /api/conversations/:id/turns
 * Add a turn to a conversation and trigger AI response via LLM
 *
 * Flow:
 * 1. Parse and validate user input (text or audio placeholder)
 * 2. Create user turn in conversation
 * 3. Process with LLM orchestrator (calls mentora-ai)
 * 4. Update conversation with AI response turn
 * 5. Return updated conversation state
 *
 * Note: Audio transcription is deferred to future implementation
 */
async function addTurn(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const conversationId = requireParam(ctx, 'id');

	// Parse request body (text or audio)
	const input = await parseMultipartForm(request);

	// Validate input
	if (!input.text && !input.audio) {
		return errorResponse(
			'Either text or audio is required',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	// Get conversation
	const conversationRef = ctx.firestore.doc(Conversations.docPath(conversationId));
	const conversationDoc = await conversationRef.get();

	if (!conversationDoc.exists) {
		return errorResponse('Conversation not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
	}

	const conversation = Conversations.schema.parse(conversationDoc.data());

	// Ownership check
	if (conversation.userId !== user.uid) {
		return errorResponse('Not authorized', HttpStatus.FORBIDDEN, ServerErrorCode.PERMISSION_DENIED);
	}

	// Check state
	if (conversation.state === 'closed') {
		return errorResponse(
			'Conversation is closed',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	try {
		const now = Date.now();
		const userTurnId = randomUUID();

		// Prepare user input text
		// If audio was provided, use a placeholder for now
		// TODO: Implement audio transcription service
		const userInputText = input.text || `[Audio message - ${input.audio?.type || 'audio/webm'}]`;

		// Create user turn
		const userTurn: Turn = {
			id: userTurnId,
			type: 'idea',
			text: userInputText,
			analysis: null,
			pendingStartAt: null,
			createdAt: now
		};

		// Get assignment for topic context
		const assignmentDoc = await ctx.firestore
			.doc(Assignments.docPath(conversation.assignmentId))
			.get();
		const assignment = assignmentDoc.exists ? Assignments.schema.parse(assignmentDoc.data()) : null;
		const topicContext = assignment?.description || '';

		// Process with LLM orchestrator
		// This handles: state initialization → dialogue stage → response generation
		const llmResult = await processWithLLM(
			ctx.firestore,
			conversationId,
			user.uid,
			userInputText,
			topicContext
		);

		// Create AI turn from LLM response
		const aiTurnId = randomUUID();
		const aiTurn: Turn = {
			id: aiTurnId,
			type: 'followup',
			text: llmResult.aiMessage,
			analysis: null, // TODO: Add stance analysis
			pendingStartAt: null,
			createdAt: now
		};

		// Update conversation with both turns
		const updatedTurns = [...conversation.turns, userTurn, aiTurn];
		const conversationState = llmResult.ended ? 'closed' : conversation.state;

		await conversationRef.update({
			turns: updatedTurns,
			state: conversationState,
			lastActionAt: now,
			updatedAt: now
		});

		// Extract summary for response
		const summary = extractConversationSummary(llmResult.updatedState);

		// Handle audio blob if provided (async, non-blocking)
		if (input.audio) {
			console.log(
				`[API] Audio blob received for turn ${userTurnId}: ${input.audio.type}, size: ${input.audio.size} bytes`
			);
			// TODO: Upload to Cloud Storage and queue transcription job
		}

		return jsonResponse(
			{
				conversationId,
				userTurnId,
				aiTurnId,
				aiMessage: llmResult.aiMessage,
				conversationEnded: llmResult.ended,
				stage: summary.stage,
				stance: summary.currentStance,
				principle: summary.currentPrinciple
			},
			HttpStatus.CREATED
		);
	} catch (error) {
		// Error handling for LLM service issues
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

		console.error('[API] Error processing turn:', error);
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

export { createConversation, endConversation, addTurn };
