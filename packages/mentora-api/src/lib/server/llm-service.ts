/**
 * LLM Service Integration Layer
 *
 * Thin wrapper around MentoraOrchestrator that handles Firestore persistence.
 * The core dialogue logic lives in mentora-ai; this file only manages state I/O.
 *
 * SECURITY: All functions validate user ownership of conversations before
 * accessing dialogue state. Pass userId to ensure authorization checks are enforced.
 */

import { MentoraOrchestrator, GeminiPromptExecutor, type DialogueState } from 'mentora-ai';
import { GoogleGenAI } from '@google/genai';
import { DialogueStage, SubState } from 'mentora-ai';
import type { Firestore } from 'fires2rest';
import { Conversations, joinPath } from 'mentora-firebase';

/**
 * Singleton orchestrator instance
 * Reuses the same orchestrator across requests for efficiency
 */
let orchestratorInstance: MentoraOrchestrator | null = null;

/**
 * Get or create the MentoraOrchestrator singleton
 *
 * The orchestrator handles all dialogue logic:
 * - Stage transitions (asking_stance → case_challenge → principle_reasoning → closure)
 * - Prompt generation via stage builders
 * - LLM communication via GeminiPromptExecutor
 * - State management (stance history, principles, etc.)
 *
 * @throws Error if GOOGLE_GENAI_API_KEY is not configured
 */
export function getOrchestrator(): MentoraOrchestrator {
	if (orchestratorInstance) {
		return orchestratorInstance;
	}

	const apiKey = process.env.GOOGLE_GENAI_API_KEY;
	if (!apiKey) {
		throw new Error(
			'GOOGLE_GENAI_API_KEY environment variable not set. ' +
				'Please configure it in your .env.local file.'
		);
	}

	const genai = new GoogleGenAI({ apiKey });
	const executor = new GeminiPromptExecutor(genai, 'gemini-2.0-flash');

	// Initialize orchestrator with default config
	orchestratorInstance = new MentoraOrchestrator(executor, {
		maxLoops: 5,
		minLoopsForClosure: 1,
		logger: (msg: string, ...args: unknown[]) => console.log(`[MentoraLLM] ${msg}`, ...args)
	});

	return orchestratorInstance;
}

/**
 * Load DialogueState from Firestore
 *
 * Path: conversations/{conversationId}/metadata/state
 *
 * SECURITY: Validates that userId matches the conversation owner before loading state.
 * This prevents unauthorized access to other users' dialogue states.
 *
 * On first interaction (no saved state), returns a fresh DialogueState
 *
 * @param firestore - Firestore instance
 * @param conversationId - The conversation ID (used as dialogue topic on init)
 * @param userId - The authenticated user ID (for ownership validation)
 * @returns DialogueState from Firestore, or new initial state
 * @throws Error if user doesn't own this conversation
 */
export async function loadDialogueState(
	firestore: Firestore,
	conversationId: string,
	userId: string
): Promise<DialogueState> {
	// Verify user owns this conversation FIRST (before any other operations)
	const conversationRef = firestore.doc(Conversations.docPath(conversationId));
	const conversationDoc = await conversationRef.get();

	if (!conversationDoc.exists) {
		throw new Error(`Conversation not found: ${conversationId}`);
	}

	const conversation = Conversations.schema.parse(conversationDoc.data());

	if (conversation.userId !== userId) {
		throw new Error('Unauthorized: User does not own this conversation');
	}

	// Safe to load state now that ownership is verified
	const stateRef = firestore.doc(joinPath('conversations', conversationId, 'metadata', 'state'));

	try {
		const stateDoc = await stateRef.get();

		if (stateDoc.exists) {
			const data = stateDoc.data();
			if (data) {
				console.log(`[MentoraLLM] Loaded dialogue state for ${conversationId}`);
				return data as unknown as DialogueState;
			}
		}
	} catch (error) {
		console.error(`[MentoraLLM] Error loading dialogue state for ${conversationId}:`, error);
	}

	console.log(`[MentoraLLM] State document not found for ${conversationId}, will initialize new`);

	// First interaction - return a fresh initial state without requiring API key
	// The orchestrator will be initialized in processWithLLM when actually needed
	const newState: DialogueState = {
		topic: conversationId,
		stage: DialogueStage.AWAITING_START,
		subState: SubState.MAIN,
		loopCount: 0,
		stanceHistory: [],
		currentStance: null,
		principleHistory: [],
		currentPrinciple: null,
		conversationHistory: [],
		discussionSatisfied: false,
		summary: null
	};
	console.log(`[MentoraLLM] Initialized new dialogue state for ${conversationId}`);

	return newState;
}

/**
 * Save DialogueState to Firestore
 *
 * SECURITY: Validates that userId matches the conversation owner before saving state.
 * This prevents unauthorized modification of other users' dialogue states.
 *
 * Persists the current dialogue state so it can be restored on next interaction
 *
 * @param firestore - Firestore instance
 * @param conversationId - The conversation ID
 * @param userId - The authenticated user ID (for ownership validation)
 * @param state - DialogueState to persist
 * @throws Error if user doesn't own this conversation
 */
export async function saveDialogueState(
	firestore: Firestore,
	conversationId: string,
	userId: string,
	state: DialogueState
): Promise<void> {
	// Verify user owns this conversation
	const conversationRef = firestore.doc(Conversations.docPath(conversationId));
	const conversationDoc = await conversationRef.get();

	if (!conversationDoc.exists) {
		throw new Error(`Conversation not found: ${conversationId}`);
	}

	const conversation = Conversations.schema.parse(conversationDoc.data());

	if (conversation.userId !== userId) {
		throw new Error('Unauthorized: User does not own this conversation');
	}

	// Safe to save state now that ownership is verified
	const stateRef = firestore.doc(joinPath('conversations', conversationId, 'metadata', 'state'));
	await stateRef.set(state as unknown as Record<string, unknown>);
	console.log(`[MentoraLLM] Saved dialogue state for ${conversationId}`);
}

/**
 * Process student input through the LLM dialogue system
 *
 * This function orchestrates the full flow:
 * 1. Load current DialogueState from Firestore (with ownership check)
 * 2. If first interaction:
 *    a. Call orchestrator.startConversation() to generate initial stance question
 *    b. Call orchestrator.processStudentInput() to process the student's first message
 * 3. If subsequent: call orchestrator.processStudentInput() to handle the input
 * 4. Save updated DialogueState back to Firestore (with ownership check)
 * 5. Return AI response and updated state
 *
 * SECURITY: Validates user ownership at both load and save steps.
 *
 * @param firestore - Firestore instance
 * @param conversationId - The conversation ID
 * @param userId - The authenticated user ID (for ownership validation)
 * @param studentMessage - The student's text input
 * @param topicContext - Optional assignment description/context for LLM
 * @returns Object with aiMessage, updatedState, and whether conversation ended
 * @throws Error if orchestrator encounters issues or user doesn't own conversation
 */
export async function processWithLLM(
	firestore: Firestore,
	conversationId: string,
	userId: string,
	studentMessage: string,
	topicContext?: string
): Promise<{
	aiMessage: string;
	updatedState: DialogueState;
	ended: boolean;
}> {
	// Step 1: Load current state from Firestore (includes ownership validation FIRST)
	const currentState = await loadDialogueState(firestore, conversationId, userId);

	// Step 2: Only initialize orchestrator after authorization is confirmed
	const orchestrator = getOrchestrator();

	// Step 3: Determine if this is first interaction
	// The orchestrator marks new states with stage === 'awaiting_start'
	const isFirstInteraction = currentState.stage === 'awaiting_start';

	let result;

	if (isFirstInteraction) {
		// First interaction: initialize the dialogue, then process student's first message
		console.log(`[MentoraLLM] First interaction detected, starting conversation`);

		// Step 3a: Call startConversation to transition from awaiting_start to asking_stance
		const initResult = await orchestrator.startConversation(currentState, topicContext || '');

		// Step 3b: Immediately process the student's first message
		console.log(`[MentoraLLM] Processing student's first message`);
		result = await orchestrator.processStudentInput(
			initResult.newState,
			studentMessage,
			topicContext || ''
		);
	} else {
		// Subsequent interactions: process the student's input
		console.log(`[MentoraLLM] Processing student input at stage: ${currentState.stage}`);
		result = await orchestrator.processStudentInput(
			currentState,
			studentMessage,
			topicContext || ''
		);
	}

	// Step 4: Save updated state to Firestore (includes ownership validation)
	await saveDialogueState(firestore, conversationId, userId, result.newState);

	// Step 5: Return formatted result
	return {
		aiMessage: result.message,
		updatedState: result.newState,
		ended: result.ended || orchestrator.isEnded(result.newState)
	};
}

/**
 * Extract a summary of the current dialogue state for API responses
 *
 * Formats the internal DialogueState into a user-friendly summary
 * showing progress through the dialogue stages
 *
 * @param state - The DialogueState to summarize
 * @returns Object with stage, current stance, principles, and progress
 */
export function extractConversationSummary(state: DialogueState) {
	return {
		stage: state.stage,
		currentStance: state.currentStance
			? {
					version: state.currentStance.version,
					position: state.currentStance.position,
					reason: state.currentStance.reason
				}
			: null,
		principleCount: state.principleHistory.length,
		currentPrinciple: state.currentPrinciple
			? {
					version: state.currentPrinciple.version,
					statement: state.currentPrinciple.statement,
					classification: state.currentPrinciple.classification
				}
			: null,
		loopCount: state.loopCount,
		discussionSatisfied: state.discussionSatisfied,
		summary: state.summary
	};
}
