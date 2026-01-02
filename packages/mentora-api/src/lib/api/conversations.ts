/**
 * Conversation operations
 */
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Conversations, type Conversation } from 'mentora-firebase';
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
			where('userId', '==', targetUserId)
		);

		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			throw new Error('Conversation not found');
		}

		return Conversations.schema.parse(snapshot.docs[0].data());
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
