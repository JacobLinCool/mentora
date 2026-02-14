/**
 * Conversation route handlers
 */

import {
	AssignmentSubmissions,
	Assignments,
	Conversations,
	Courses,
	joinPath,
	type Assignment,
	type Conversation,
	type ConversationTokenUsage,
	type Submission,
	type TokenUsageBreakdown,
	type TokenUsageTotals,
	type Turn
} from 'mentora-firebase';
import { CreateConversationSchema } from '../llm/schemas.js';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { parseBody, requireAuth, requireDocument, requireParam } from './utils.js';
import { processWithLLM, extractConversationSummary } from '../llm/llm-service.js';
import { EXECUTOR_MODEL, getASRExecutor, getTTSExecutor } from '../llm/executors.js';
import {
	TOKEN_USAGE_FEATURES,
	createTokenUsageReport,
	mergeTokenUsageReports,
	type TokenUsageReport
} from '../llm/token-usage.js';
import { randomUUID } from 'node:crypto';

async function ensureSubmissionInProgress(
	ctx: RouteContext,
	assignment: Assignment,
	userId: string
): Promise<void> {
	const submissionRef = ctx.firestore.doc(AssignmentSubmissions.docPath(assignment.id, userId));
	const existingDoc = await submissionRef.get();

	if (existingDoc.exists) {
		const existing = AssignmentSubmissions.schema.parse(existingDoc.data());
		if (existing.state === 'in_progress') {
			return;
		}

		const restarted: Submission = {
			...existing,
			userId,
			state: 'in_progress',
			submittedAt: null,
			late: false,
			scoreCompletion: null,
			notes: null
		};

		await submissionRef.set(AssignmentSubmissions.schema.parse(restarted));
		return;
	}

	const submission: Submission = {
		userId,
		state: 'in_progress',
		startedAt: Date.now(),
		submittedAt: null,
		late: false,
		scoreCompletion: null,
		notes: null
	};

	await submissionRef.set(AssignmentSubmissions.schema.parse(submission));
}

function ensureSubmissionWindow(assignment: Assignment, submittedAt: number): void {
	if (assignment.dueAt != null && submittedAt > assignment.dueAt && !assignment.allowLate) {
		throw errorResponse(
			'Assignment due date has passed',
			HttpStatus.FORBIDDEN,
			ServerErrorCode.PERMISSION_DENIED
		);
	}
}

async function submitSubmission(
	ctx: RouteContext,
	assignment: Assignment,
	userId: string
): Promise<void> {
	const submissionRef = ctx.firestore.doc(AssignmentSubmissions.docPath(assignment.id, userId));
	const existingDoc = await submissionRef.get();
	const submittedAt = Date.now();
	ensureSubmissionWindow(assignment, submittedAt);
	const isLate = assignment.dueAt != null && submittedAt > assignment.dueAt;

	let startedAt = submittedAt;
	let scoreCompletion: number | null = null;
	let notes: string | null = null;

	if (existingDoc.exists) {
		const existing = AssignmentSubmissions.schema.parse(existingDoc.data());
		startedAt = existing.startedAt;
		scoreCompletion = existing.scoreCompletion ?? null;
		notes = existing.notes ?? null;
	}

	const submitted: Submission = {
		userId,
		state: 'submitted',
		startedAt,
		submittedAt,
		late: isLate,
		scoreCompletion,
		notes
	};

	await submissionRef.set(AssignmentSubmissions.schema.parse(submitted));
}

function hasTokenUsage(usage: TokenUsageTotals): boolean {
	return usage.totalTokenCount > 0 || usage.inputTokenCount > 0 || usage.outputTokenCount > 0;
}

function toTurnTokenUsage(report: TokenUsageReport): TokenUsageBreakdown | null {
	if (!hasTokenUsage(report.totals)) {
		return null;
	}

	return {
		byFeature: report.byFeature,
		totals: report.totals
	};
}

function toConversationTokenUsage(
	existing: ConversationTokenUsage | null | undefined,
	requestUsage: TokenUsageReport,
	updatedAt: number
): ConversationTokenUsage | null {
	const mergedUsage = mergeTokenUsageReports(
		existing
			? {
					byFeature: existing.byFeature ?? {},
					totals: existing.totals
				}
			: null,
		requestUsage
	);

	if (!hasTokenUsage(mergedUsage.totals)) {
		return null;
	}

	return {
		byFeature: mergedUsage.byFeature,
		totals: mergedUsage.totals,
		updatedAt
	};
}

function getTokenUsageModels(report: TokenUsageReport): Record<string, string> {
	const models: Record<string, string> = {};

	if (report.byFeature[TOKEN_USAGE_FEATURES.CONVERSATION_ASR]) {
		models[TOKEN_USAGE_FEATURES.CONVERSATION_ASR] = EXECUTOR_MODEL.ASR;
	}
	if (report.byFeature[TOKEN_USAGE_FEATURES.CONVERSATION_LLM]) {
		models[TOKEN_USAGE_FEATURES.CONVERSATION_LLM] = EXECUTOR_MODEL.PROMPT;
	}
	if (report.byFeature[TOKEN_USAGE_FEATURES.CONVERSATION_TTS]) {
		models[TOKEN_USAGE_FEATURES.CONVERSATION_TTS] = EXECUTOR_MODEL.TTS;
	}

	return models;
}

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
	const assignment = await requireDocument(
		ctx,
		Assignments.docPath(assignmentId),
		Assignments.schema,
		'Assignment'
	);

	// 2. Check if started
	if (assignment.startAt > Date.now()) {
		return errorResponse(
			'Assignment has not started yet',
			HttpStatus.FORBIDDEN,
			ServerErrorCode.PERMISSION_DENIED
		);
	}

	ensureSubmissionWindow(assignment, Date.now());

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
		if (data.state !== 'closed') {
			await ensureSubmissionInProgress(ctx, assignment, user.uid);
			return jsonResponse({ id: conversationId, created: false, reopened: false });
		}

		if (!assignment.allowResubmit) {
			return errorResponse(
				'Conversation completed and resubmission not allowed',
				HttpStatus.CONFLICT,
				ServerErrorCode.ALREADY_EXISTS
			);
		}

		// Reopen the same conversation for resubmission.
		const now = Date.now();
		await conversationRef.update({
			state: 'awaiting_idea',
			lastActionAt: now,
			updatedAt: now
		});

		// Reset dialogue state to prevent stale closed-session carry-over.
		try {
			await ctx.firestore
				.doc(joinPath('conversations', conversationId, 'metadata', 'state'))
				.delete();
		} catch {
			// Missing metadata doc is expected on some conversations.
		}

		await ensureSubmissionInProgress(ctx, assignment, user.uid);
		return jsonResponse({ id: conversationId, created: false, reopened: true });
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
		turns: [],
		tokenUsage: null
	};

	const validated = Conversations.schema.parse(conversation);
	await conversationRef.set(validated);
	await ensureSubmissionInProgress(ctx, assignment, user.uid);

	return jsonResponse({ id: conversationId, created: true, reopened: false }, HttpStatus.CREATED);
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

	const assignment = await requireDocument(
		ctx,
		Assignments.docPath(conversation.assignmentId),
		Assignments.schema,
		'Assignment'
	);

	// Check state
	if (conversation.state === 'closed') {
		return errorResponse(
			'Conversation already closed',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	// Submit assignment and then close conversation
	await submitSubmission(ctx, assignment, user.uid);

	const now = Date.now();
	await conversationRef.update({
		state: 'closed',
		lastActionAt: now,
		updatedAt: now
	});

	return jsonResponse({});
}

/**
 * Helper to parse request body
 * Returns either { text: string } or { audioBase64: string; audioMimeType: string }
 */
async function parseMultipartForm(
	request: Request
): Promise<{ text: string } | { audioBase64: string; audioMimeType: string }> {
	const contentType = request.headers.get('content-type') || '';

	// Handle JSON (for text or base64 audio)
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

	// Handle multipart form data (for audio)
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
 * POST /api/conversations/:id/turns
 * Add a turn to a conversation and trigger AI response via LLM
 *
 * Flow:
 * 1. Parse and validate user input (text or audio placeholder)
 * 2. Create user turn in conversation
 * 3. Process with LLM orchestrator (calls mentora-ai)
 * 4. Update conversation with AI response turn
 * 5. Return updated conversation state
 */
async function addTurn(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const conversationId = requireParam(ctx, 'id');

	// Parse request body (text or audio)
	const input = await parseMultipartForm(request);

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
		let asrUsageReport = createTokenUsageReport([]);
		let llmUsageReport = createTokenUsageReport([]);
		let ttsUsageReport = createTokenUsageReport([]);

		// Prepare user input text
		let userInputText: string;

		if ('audioBase64' in input) {
			// Audio provided (base64) - transcribe it
			try {
				const asrExecutor = getASRExecutor();
				asrExecutor.resetTokenUsage();

				// Transcribe base64 audio
				userInputText = await asrExecutor.transcribe(input.audioBase64, input.audioMimeType);

				console.log(
					`[API] Audio transcribed for turn ${userTurnId}: "${userInputText.substring(0, 50)}..."`
				);

				asrUsageReport = createTokenUsageReport([
					{
						feature: TOKEN_USAGE_FEATURES.CONVERSATION_ASR,
						usage: asrExecutor.getTokenUsage()
					}
				]);
				console.log(`[API] ASR token usage:`, asrUsageReport.totals);
			} catch (error) {
				console.error('[API] Error transcribing audio:', error);
				return errorResponse(
					'Failed to transcribe audio. Please try again or use text input.',
					HttpStatus.INTERNAL_SERVER_ERROR,
					ServerErrorCode.INTERNAL_ERROR
				);
			}
		} else {
			// Text provided directly
			userInputText = input.text;
		}

		// Create user turn
		const userTurn: Turn = {
			id: userTurnId,
			type: 'idea',
			text: userInputText,
			analysis: null,
			pendingStartAt: null,
			tokenUsage: null,
			createdAt: now
		};

		// Get assignment for topic context
		const assignment = await requireDocument(
			ctx,
			Assignments.docPath(conversation.assignmentId),
			Assignments.schema,
			'Assignment'
		);
		ensureSubmissionWindow(assignment, Date.now());
		const question = assignment.question || '';
		const prompt = assignment.prompt || '';

		// Process with LLM orchestrator
		// This handles: state initialization → dialogue stage → response generation
		const llmResult = await processWithLLM(
			ctx.firestore,
			conversationId,
			user.uid,
			userInputText,
			question,
			prompt
		);
		llmUsageReport = createTokenUsageReport([
			{
				feature: TOKEN_USAGE_FEATURES.CONVERSATION_LLM,
				usage: llmResult.tokenUsage
			}
		]);
		console.log(`[API] LLM token usage:`, llmUsageReport.totals);

		// Prepare AI turn ID before TTS
		const aiTurnId = randomUUID();

		// Synthesize AI response to speech
		let aiAudioBase64: string;
		const aiAudioMimeType = 'audio/mp3';
		try {
			const ttsExecutor = getTTSExecutor();
			ttsExecutor.resetTokenUsage();

			// Synthesize AI message to speech
			aiAudioBase64 = await ttsExecutor.synthesize(llmResult.aiMessage);

			console.log(`[API] AI message synthesized to speech for turn ${aiTurnId}`);

			ttsUsageReport = createTokenUsageReport([
				{
					feature: TOKEN_USAGE_FEATURES.CONVERSATION_TTS,
					usage: ttsExecutor.getTokenUsage()
				}
			]);
			console.log(`[API] TTS token usage:`, ttsUsageReport.totals);
		} catch (error) {
			console.error('[API] Error synthesizing speech:', error);
			// TTS is required, return error
			return errorResponse(
				'Failed to synthesize speech. Please try again.',
				HttpStatus.INTERNAL_SERVER_ERROR,
				ServerErrorCode.INTERNAL_ERROR
			);
		}

		// Capture fresh timestamp after LLM and TTS processing completes
		const finalNow = Date.now();
		const aiTurnUsageReport = mergeTokenUsageReports(llmUsageReport, ttsUsageReport);
		const requestUsageReport = mergeTokenUsageReports(asrUsageReport, aiTurnUsageReport);
		const userTurnTokenUsage = toTurnTokenUsage(asrUsageReport);
		const aiTurnTokenUsage = toTurnTokenUsage(aiTurnUsageReport);

		// Create AI turn from LLM response
		const aiTurn: Turn = {
			id: aiTurnId,
			type: 'followup',
			text: llmResult.aiMessage,
			analysis: null, // TODO: Add stance analysis
			pendingStartAt: null,
			tokenUsage: aiTurnTokenUsage,
			createdAt: finalNow
		};

		// Update conversation with both turns
		const updatedTurns = [
			{
				...userTurn,
				tokenUsage: userTurnTokenUsage
			},
			aiTurn
		];

		await ctx.firestore.runTransaction(async (transaction) => {
			const latestConversationDoc = await transaction.get(conversationRef);
			if (!latestConversationDoc.exists) {
				throw errorResponse(
					'Conversation not found',
					HttpStatus.NOT_FOUND,
					ServerErrorCode.NOT_FOUND
				);
			}

			const latestConversation = Conversations.schema.parse(latestConversationDoc.data());
			if (latestConversation.userId !== user.uid) {
				throw errorResponse(
					'Not authorized',
					HttpStatus.FORBIDDEN,
					ServerErrorCode.PERMISSION_DENIED
				);
			}
			if (latestConversation.state === 'closed') {
				throw errorResponse(
					'Conversation is closed',
					HttpStatus.BAD_REQUEST,
					ServerErrorCode.INVALID_INPUT
				);
			}

			const conversationState = llmResult.ended ? 'closed' : latestConversation.state;
			const conversationTokenUsage = toConversationTokenUsage(
				latestConversation.tokenUsage,
				requestUsageReport,
				finalNow
			);

			transaction.update(conversationRef, {
				turns: [...latestConversation.turns, ...updatedTurns],
				state: conversationState,
				lastActionAt: finalNow,
				updatedAt: finalNow,
				tokenUsage: conversationTokenUsage
			});
		});

		if (llmResult.ended) {
			await submitSubmission(ctx, assignment, user.uid);
		}

		// Extract summary for response
		const summary = extractConversationSummary(llmResult.updatedState);

		return jsonResponse(
			{
				text: llmResult.aiMessage,
				audio: aiAudioBase64,
				audioMimeType: aiAudioMimeType,
				// Additional metadata
				conversationId,
				userTurnId,
				aiTurnId,
				conversationEnded: llmResult.ended,
				stage: summary.stage,
				stance: summary.currentStance,
				principle: summary.currentPrinciple,
				tokenUsage: {
					byFeature: requestUsageReport.byFeature,
					totals: requestUsageReport.totals,
					models: getTokenUsageModels(requestUsageReport)
				}
			},
			HttpStatus.CREATED
		);
	} catch (error) {
		// Re-throw Response errors from utility functions (auth, validation, etc.)
		if (error instanceof Response) throw error;

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
