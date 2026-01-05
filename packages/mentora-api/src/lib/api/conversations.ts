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
	runTransaction,
	setDoc,
	updateDoc,
	where,
	limit
} from 'firebase/firestore';
import {
	Assignments,
	AssignmentSubmissions,
	Conversations,
	Courses,
	type Conversation,
	type ConversationState,
	type Submission,
	type Turn
} from 'mentora-firebase';
import type { ReactiveState } from './state.svelte';
import { failure, success, tryCatch, type APIResult, type MentoraAPIConfig } from './types.js';

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

/**
 * Create a conversation for an assignment
 *
 * This performs all validation directly in the client:
 * - Checks assignment exists and has started
 * - Checks user enrollment (if course-bound)
 * - Prevents duplicate conversations (returns existing if found)
 *
 * Security is enforced by Firestore Security Rules.
 */
export async function createConversation(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<{ id: string; state: ConversationState; isExisting: boolean }>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		// Get the assignment
		const assignmentDoc = await getDoc(doc(config.db, Assignments.docPath(assignmentId)));

		if (!assignmentDoc.exists()) {
			throw new Error('Assignment not found');
		}

		const assignment = Assignments.schema.parse(assignmentDoc.data());

		// Check if assignment has started
		if (assignment.startAt > Date.now()) {
			throw new Error('Assignment has not started yet');
		}

		// Check if user is enrolled in the course (if assignment belongs to a course)
		if (assignment.courseId) {
			const membershipDoc = await getDoc(
				doc(config.db, Courses.roster.docPath(assignment.courseId, currentUser.uid))
			);

			if (!membershipDoc.exists() || membershipDoc.data()?.status !== 'active') {
				throw new Error('Not enrolled in this course');
			}
		}

		// Check if conversation already exists
		const existingQuery = query(
			collection(config.db, Conversations.collectionPath()),
			where('assignmentId', '==', assignmentId),
			where('userId', '==', currentUser.uid),
			limit(1)
		);

		const existingConversations = await getDocs(existingQuery);

		if (!existingConversations.empty) {
			const existingConv = existingConversations.docs[0];
			const data = existingConv.data();

			// If conversation exists and is not closed, return it
			if (data.state !== 'closed' || assignment.allowResubmit) {
				return {
					id: existingConv.id,
					state: data.state as ConversationState,
					isExisting: true
				};
			} else {
				throw new Error('Conversation already completed and resubmission not allowed');
			}
		}

		// Create new conversation
		const now = Date.now();
		const conversationRef = doc(collection(config.db, Conversations.collectionPath()));
		const conversationId = conversationRef.id;

		const conversation: Conversation = {
			id: conversationId,
			assignmentId,
			userId: currentUser.uid,
			state: 'awaiting_idea',
			lastActionAt: now,
			createdAt: now,
			updatedAt: now,
			turns: []
		};

		// Validate and save
		const validated = Conversations.schema.parse(conversation);
		await setDoc(conversationRef, validated);

		return {
			id: conversationId,
			state: validated.state,
			isExisting: false
		};
	});
}

/**
 * End a conversation
 *
 * This performs the finalization directly in the client:
 * - Updates conversation state to 'closed'
 * - Creates or updates the submission
 *
 * Security is enforced by Firestore Security Rules.
 */
export async function endConversation(
	config: MentoraAPIConfig,
	conversationId: string
): Promise<APIResult<{ state: ConversationState; conversation: Conversation }>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const conversationRef = doc(config.db, Conversations.docPath(conversationId));

		// Use transaction to ensure atomicity
		const result = await runTransaction(config.db, async (transaction) => {
			const conversationDoc = await transaction.get(conversationRef);

			if (!conversationDoc.exists()) {
				throw new Error('Conversation not found');
			}

			const conversation = Conversations.schema.parse(conversationDoc.data());

			// Check ownership
			if (conversation.userId !== currentUser.uid) {
				throw new Error('Not authorized');
			}

			// Check if already closed
			if (conversation.state === 'closed') {
				return { state: 'closed' as ConversationState, conversation, alreadyClosed: true };
			}

			const now = Date.now();

			// Update conversation state
			transaction.update(conversationRef, {
				state: 'closed' as ConversationState,
				lastActionAt: now,
				updatedAt: now
			});

			// Create or update submission
			const submissionRef = doc(
				config.db,
				AssignmentSubmissions.docPath(conversation.assignmentId, conversation.userId)
			);

			const submissionDoc = await transaction.get(submissionRef);

			if (submissionDoc.exists()) {
				// Update existing submission
				transaction.update(submissionRef, {
					state: 'submitted',
					submittedAt: now
				});
			} else {
				// Get assignment to check due date
				const assignmentDoc = await getDoc(
					doc(config.db, Assignments.docPath(conversation.assignmentId))
				);
				const assignment = assignmentDoc.data();
				const isLate = assignment?.dueAt ? now > assignment.dueAt : false;

				// Create new submission
				const submission: Submission = {
					userId: conversation.userId,
					state: 'submitted',
					startedAt: conversation.createdAt,
					submittedAt: now,
					late: isLate,
					scoreCompletion: null,
					notes: null
				};
				transaction.set(submissionRef, submission);
			}

			// Return updated conversation
			const updatedConversation: Conversation = {
				...conversation,
				state: 'closed',
				lastActionAt: now,
				updatedAt: now
			};

			return {
				state: 'closed' as ConversationState,
				conversation: updatedConversation,
				alreadyClosed: false
			};
		});

		return result;
	});
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
