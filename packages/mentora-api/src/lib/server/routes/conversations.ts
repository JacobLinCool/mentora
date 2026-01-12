/**
 * Conversation route handlers
 */

import { Assignments, Conversations, Courses, type Conversation } from 'mentora-firebase';
import { CreateConversationSchema } from '../schemas.js';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { parseBody, requireAuth, requireParam } from './utils.js';

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
 * POST /api/conversations/:id/turns
 * Add a turn to a conversation and trigger AI response
 */
async function addTurn(ctx: RouteContext): Promise<Response> {
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
			'Conversation is closed',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	// TODO: Integrate with LLM service
	// For now, just acknowledge the turn was received
	// The actual LLM integration would add turns to Firestore

	const now = Date.now();
	await conversationRef.update({
		lastActionAt: now,
		updatedAt: now
	});

	return jsonResponse({});
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
