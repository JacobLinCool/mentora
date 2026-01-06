/**
 * Statistics operations
 *
 * Simple read operations for conversation analytics.
 * All data is read directly from existing Firestore collections.
 */

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Conversations, type Conversation } from 'mentora-firebase';
import { tryCatch, type APIResult, type MentoraAPIConfig } from './types.js';

/**
 * Completion status counts
 */
export interface CompletionStatus {
	completed: number;
	inProgress: number;
	notStarted: number;
}

/**
 * Get conversation analytics
 *
 * Reads a single conversation and calculates basic analytics from its turns.
 */
export async function getConversationAnalytics(
	config: MentoraAPIConfig,
	conversationId: string
): Promise<
	APIResult<{
		conversation: Conversation;
		analytics: {
			totalTurns: number;
			userTurns: number;
			aiTurns: number;
			averageResponseLength: number;
			stanceProgression: Array<{ turnId: string; stance: string | null }>;
			strategiesUsed: string[];
			duration: number;
		};
	}>
> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Conversations.docPath(conversationId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Conversation not found');
		}

		const conversation = Conversations.schema.parse(snapshot.data());

		// Calculate analytics from turns
		const userTurns = conversation.turns.filter((t) => ['idea', 'followup'].includes(t.type));
		const aiTurns = conversation.turns.filter((t) => ['counterpoint', 'summary'].includes(t.type));

		const avgResponseLength =
			aiTurns.length > 0 ? aiTurns.reduce((sum, t) => sum + t.text.length, 0) / aiTurns.length : 0;

		const stanceProgression = userTurns.map((t) => ({
			turnId: t.id,
			stance: t.analysis?.stance ?? null
		}));

		const strategiesUsed = [
			...new Set(aiTurns.filter((t) => t.analysis?.stance).map((t) => t.type))
		];

		const duration =
			conversation.turns.length >= 2
				? conversation.turns[conversation.turns.length - 1].createdAt -
					conversation.turns[0].createdAt
				: 0;

		return {
			conversation,
			analytics: {
				totalTurns: conversation.turns.length,
				userTurns: userTurns.length,
				aiTurns: aiTurns.length,
				averageResponseLength: Math.round(avgResponseLength),
				stanceProgression,
				strategiesUsed,
				duration
			}
		};
	});
}

/**
 * Get completion status for an assignment
 *
 * Queries conversations for a specific assignment to count completion states.
 */
export async function getAssignmentCompletionStatus(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<CompletionStatus>> {
	return tryCatch(async () => {
		const q = query(
			collection(config.db, Conversations.collectionPath()),
			where('assignmentId', '==', assignmentId)
		);

		const snapshot = await getDocs(q);

		let completed = 0;
		let inProgress = 0;

		snapshot.docs.forEach((doc) => {
			const data = doc.data();
			if (data.state === 'closed') {
				completed++;
			} else {
				inProgress++;
			}
		});

		return {
			completed,
			inProgress,
			notStarted: 0 // Would need roster data to calculate
		};
	});
}
