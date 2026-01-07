/**
 * Conversation operations
 *
 * Mixed access pattern:
 * - Read operations: Direct via Firestore SDK
 * - Write operations: Delegated to backend for LLM processing
 */
import {
	collection,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	query,
	where,
	limit
} from 'firebase/firestore';
import { Conversations, type Conversation as ConversationDoc } from 'mentora-firebase';

export type Conversation = ConversationDoc & { id: string };

import { callBackend } from './backend.js';
import type { ReactiveState } from './state.svelte';
import { failure, tryCatch, type APIResult, type MentoraAPIConfig } from './types.js';

/**
 * Get a conversation by ID
 */
export async function getConversation(
	config: MentoraAPIConfig,
	conversationId: string
): Promise<APIResult<Conversation>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Conversations.docPath(conversationId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Conversation not found');
		}

		return {
			id: snapshot.id,
			...Conversations.schema.parse(snapshot.data())
		};
	});
}

/**
 * Get conversation for an assignment and user
 */
export async function getAssignmentConversation(
	config: MentoraAPIConfig,
	assignmentId: string,
	userId?: string
): Promise<APIResult<Conversation>> {
	const targetUserId = userId || config.getCurrentUser()?.uid;

	if (!targetUserId) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const q = query(
			collection(config.db, Conversations.collectionPath()),
			where('assignmentId', '==', assignmentId),
			where('userId', '==', targetUserId),
			limit(1)
		);

		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			throw new Error('Conversation not found');
		}

		return {
			id: snapshot.docs[0].id,
			...Conversations.schema.parse(snapshot.docs[0].data())
		};
	});
}

/**
 * Create a conversation for an assignment
 *
 * Delegated to backend for validation and initialization.
 */
export async function createConversation(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<{ id: string }>> {
	return callBackend(config, '/api/conversations', {
		method: 'POST',
		body: JSON.stringify({ assignmentId })
	});
}

/**
 * End a conversation
 *
 * Delegated to backend for finalization and submission creation.
 */
export async function endConversation(
	config: MentoraAPIConfig,
	conversationId: string
): Promise<APIResult<void>> {
	return callBackend(config, `/api/conversations/${conversationId}/end`, {
		method: 'POST'
	});
}

/**
 * Add a turn to a conversation and trigger AI response
 *
 * Sends the user message to the backend which:
 * 1. Adds the user turn to the conversation
 * 2. Processes the message with LLM
 * 3. Adds the AI response turn
 */
export async function addTurn(
	config: MentoraAPIConfig,
	conversationId: string,
	text: string,
	type: 'idea' | 'followup'
): Promise<APIResult<void>> {
	return callBackend(config, `/api/conversations/${conversationId}/turns`, {
		method: 'POST',
		body: JSON.stringify({ text, type })
	});
}

/**
 * Subscribe to conversation changes
 */
export function subscribeToConversation(
	config: MentoraAPIConfig,
	conversationId: string,
	state: ReactiveState<Conversation>
): void {
	state.setLoading(true);
	const docRef = doc(config.db, Conversations.docPath(conversationId));

	const unsubscribe = onSnapshot(
		docRef,
		(snapshot) => {
			if (snapshot.exists()) {
				try {
					const data = Conversations.schema.parse(snapshot.data());
					state.set({
						id: snapshot.id,
						...data
					});
					state.setError(null);
				} catch (error) {
					state.setError(error instanceof Error ? error.message : 'Parse error');
				}
			} else {
				state.setError('Conversation not found');
			}
			state.setLoading(false);
		},
		(error) => {
			state.setError(error.message);
			state.setLoading(false);
		}
	);

	state.attachUnsubscribe(unsubscribe);
}
