/**
 * Conversation operations
 *
 * All operations are performed directly via Firestore SDK.
 * Security is enforced by Firestore Security Rules.
 */
import {
	collection,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	query,
	updateDoc,
	where,
	limit
} from 'firebase/firestore';
import {
	Conversations,
	type Conversation,
	type ConversationState,
	type Turn
} from 'mentora-firebase';
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

		return Conversations.schema.parse(snapshot.data());
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

		return Conversations.schema.parse(snapshot.docs[0].data());
	});
}

import {
	createConversation as createConversationBackend,
	endConversation as endConversationBackend
} from './access/delegated.js';

// ... (previous code)

/**
 * Create a conversation for an assignment
 *
 * Delegated to backend for validation and initialization.
 */
export async function createConversation(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<{ id: string; state: ConversationState; isExisting: boolean }>> {
	return createConversationBackend(
		{
			backendBaseUrl: config.backendBaseUrl,
			getCurrentUser: config.getCurrentUser
		},
		assignmentId
	) as Promise<APIResult<{ id: string; state: ConversationState; isExisting: boolean }>>;
}

/**
 * End a conversation
 *
 * Delegated to backend for finalization and submission creation.
 */
export async function endConversation(
	config: MentoraAPIConfig,
	conversationId: string
): Promise<APIResult<{ state: ConversationState; conversation: Conversation }>> {
	return endConversationBackend(
		{
			backendBaseUrl: config.backendBaseUrl,
			getCurrentUser: config.getCurrentUser
		},
		conversationId
	) as Promise<APIResult<{ state: ConversationState; conversation: Conversation }>>;
}

/**
 * Add a turn to a conversation
 *
 * Adds a user turn (idea or followup) to the conversation.
 */
export async function addTurn(
	config: MentoraAPIConfig,
	conversationId: string,
	text: string,
	type: 'idea' | 'followup'
): Promise<APIResult<{ turnId: string; conversation: Conversation }>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const conversationRef = doc(config.db, Conversations.docPath(conversationId));
		const conversationDoc = await getDoc(conversationRef);

		if (!conversationDoc.exists()) {
			throw new Error('Conversation not found');
		}

		const conversation = Conversations.schema.parse(conversationDoc.data());

		// Check ownership
		if (conversation.userId !== currentUser.uid) {
			throw new Error('Not authorized');
		}

		// Check conversation state
		if (conversation.state === 'closed') {
			throw new Error('Conversation is already closed');
		}

		const now = Date.now();
		const turnId = `turn_${now}_user`;

		const newTurn: Turn = {
			id: turnId,
			type,
			text: text.trim(),
			analysis: null,
			pendingStartAt: null,
			createdAt: now
		};

		// Determine new state based on current state
		let newState: ConversationState = conversation.state;
		if (type === 'idea' && conversation.state === 'awaiting_idea') {
			newState = 'adding_counterpoint';
		} else if (type === 'followup' && conversation.state === 'awaiting_followup') {
			newState = 'adding_counterpoint';
		}

		await updateDoc(conversationRef, {
			turns: [...conversation.turns, newTurn],
			state: newState,
			lastActionAt: now,
			updatedAt: now
		});

		// Fetch updated conversation
		const updatedDoc = await getDoc(conversationRef);
		const updatedConversation = Conversations.schema.parse(updatedDoc.data());

		return { turnId, conversation: updatedConversation };
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
					state.set(data);
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
