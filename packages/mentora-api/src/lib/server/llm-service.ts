/**
 * LLM Service Integration Layer
 *
 * Thin wrapper around MentoraOrchestrator that handles Firestore persistence.
 * The core dialogue logic lives in mentora-ai; this file only manages state I/O.
 */

import { MentoraOrchestrator, GeminiPromptExecutor, type DialogueState } from 'mentora-ai';
import { GoogleGenAI } from '@google/genai';
import type { Firestore } from 'fires2rest';

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
		logger: (msg, ...args) => console.log(`[MentoraLLM] ${msg}`, ...args)
	});

	return orchestratorInstance;
}

/**
 * Load DialogueState from Firestore
 *
 * Path: conversations/{conversationId}/metadata/state
 *
 * On first interaction (no saved state), returns a fresh DialogueState
 * via orchestrator.initializeSession()
 *
 * @param firestore - Firestore instance
 * @param conversationId - The conversation ID (used as dialogue topic on init)
 * @returns DialogueState from Firestore, or new initial state
 */
export async function loadDialogueState(
	firestore: Firestore,
	conversationId: string
): Promise<DialogueState> {
	const stateRef = firestore.doc(`conversations/${conversationId}/metadata/state`);

	try {
		const stateDoc = await stateRef.get();

		if (stateDoc.exists) {
			const data = stateDoc.data();
			console.log(`[MentoraLLM] Loaded dialogue state for ${conversationId}`);
			return data as DialogueState;
		}
	} catch (error) {
		console.log(`[MentoraLLM] State document not found for ${conversationId}, will initialize new`);
	}

	// First interaction - initialize new state using orchestrator
	const orchestrator = getOrchestrator();
	const newState = orchestrator.initializeSession(conversationId);
	console.log(`[MentoraLLM] Initialized new dialogue state for ${conversationId}`);

	return newState;
}

/**
 * Save DialogueState to Firestore
 *
 * Persists the current dialogue state so it can be restored on next interaction
 *
 * @param firestore - Firestore instance
 * @param conversationId - The conversation ID
 * @param state - DialogueState to persist
 */
export async function saveDialogueState(
	firestore: Firestore,
	conversationId: string,
	state: DialogueState
): Promise<void> {
	const stateRef = firestore.doc(`conversations/${conversationId}/metadata/state`);
	await stateRef.set(state);
	console.log(`[MentoraLLM] Saved dialogue state for ${conversationId}`);
}

/**
 * Process student input through the LLM dialogue system
 *
 * This function orchestrates the full flow:
 * 1. Load current DialogueState from Firestore
 * 2. If first interaction: call orchestrator.startConversation() to generate initial question
 * 3. If subsequent: call orchestrator.processStudentInput() to handle the input
 * 4. Save updated DialogueState back to Firestore
 * 5. Return AI response and updated state
 *
 * @param firestore - Firestore instance
 * @param conversationId - The conversation ID
 * @param studentMessage - The student's text input
 * @param topicContext - Optional assignment description/context for LLM
 * @returns Object with aiMessage, updatedState, and whether conversation ended
 * @throws Error if orchestrator or LLM encounters issues
 */
export async function processWithLLM(
	firestore: Firestore,
	conversationId: string,
	studentMessage: string,
	topicContext?: string
): Promise<{
	aiMessage: string;
	updatedState: DialogueState;
	ended: boolean;
}> {
	const orchestrator = getOrchestrator();

	// Step 1: Load current state from Firestore
	let currentState = await loadDialogueState(firestore, conversationId);

	// Step 2: Determine if this is first interaction
	// The orchestrator marks new states with stage === 'awaiting_start'
	const isFirstInteraction = currentState.stage === 'awaiting_start';

	let result;

	if (isFirstInteraction) {
		// First interaction: generate initial stance question
		console.log(`[MentoraLLM] First interaction detected, starting conversation`);
		result = await orchestrator.startConversation(currentState, topicContext || '');
	} else {
		// Subsequent interactions: process the student's input
		console.log(`[MentoraLLM] Processing student input at stage: ${currentState.stage}`);
		result = await orchestrator.processStudentInput(
			currentState,
			studentMessage,
			topicContext || ''
		);
	}

	// Step 3: Save updated state to Firestore
	await saveDialogueState(firestore, conversationId, result.newState);

	// Step 4: Return formatted result
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
