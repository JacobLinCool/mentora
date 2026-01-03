/**
 * Statistics operations
 *
 * Provides APIs for retrieving assignment and course statistics,
 * including stance distribution, word clouds, and progress tracking.
 */

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Conversations, type Conversation, type MessageStance } from 'mentora-firebase';
import { failure, success, tryCatch, type APIResult, type MentoraAPIConfig } from './types.js';

/**
 * Stance distribution for an assignment
 */
export interface StanceDistribution {
	pro: number;
	con: number;
	neutral: number;
	undetermined: number;
}

/**
 * Stance shift tracking
 */
export interface StanceShift {
	from: MessageStance;
	to: MessageStance;
	count: number;
}

/**
 * Word cloud entry
 */
export interface WordCloudEntry {
	word: string;
	count: number;
	users: string[];
}

/**
 * Word cloud by stance
 */
export interface StanceWordCloud {
	pro: WordCloudEntry[];
	con: WordCloudEntry[];
	neutral: WordCloudEntry[];
}

/**
 * Completion status counts
 */
export interface CompletionStatus {
	completed: number;
	inProgress: number;
	notStarted: number;
}

/**
 * Assignment statistics
 */
export interface AssignmentStatistics {
	assignmentId: string;
	totalStudents: number;
	completionStatus: CompletionStatus;
	stanceDistribution: {
		initial: StanceDistribution;
		final: StanceDistribution;
	};
	stanceShifts: StanceShift[];
	wordCloud: StanceWordCloud;
	averageTurns: number;
	averageDuration: number;
	lastUpdatedAt: number;
}

/**
 * Course statistics summary
 */
export interface CourseStatistics {
	courseId: string;
	totalAssignments: number;
	totalStudents: number;
	averageCompletionRate: number;
	totalConversations: number;
	averageTurnsPerConversation: number;
	lastUpdatedAt: number;
}

/**
 * Student progress entry
 */
export interface StudentProgress {
	userId: string;
	email?: string;
	displayName?: string;
	assignmentsCompleted: number;
	assignmentsTotal: number;
	averageStance: string;
	totalTurns: number;
	lastActivityAt: number;
}

/**
 * Get statistics for an assignment
 */
export async function getAssignmentStatistics(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<AssignmentStatistics>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	try {
		const token = await currentUser.getIdToken();
		const response = await fetch(
			`${config.backendBaseUrl}/api/assignments/${assignmentId}/statistics`,
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		);

		if (!response.ok) {
			const error = await response.text();
			return failure(error || `HTTP ${response.status}`);
		}

		const data = await response.json();
		return success(data);
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Network error');
	}
}

/**
 * Get statistics for a course
 */
export async function getCourseStatistics(
	config: MentoraAPIConfig,
	courseId: string
): Promise<APIResult<CourseStatistics>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	try {
		const token = await currentUser.getIdToken();
		const response = await fetch(`${config.backendBaseUrl}/api/courses/${courseId}/statistics`, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			const error = await response.text();
			return failure(error || `HTTP ${response.status}`);
		}

		const data = await response.json();
		return success(data);
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Network error');
	}
}

/**
 * Get student progress for a course
 */
export async function getCourseStudentProgress(
	config: MentoraAPIConfig,
	courseId: string
): Promise<APIResult<StudentProgress[]>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	try {
		const token = await currentUser.getIdToken();
		const response = await fetch(
			`${config.backendBaseUrl}/api/courses/${courseId}/students/progress`,
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		);

		if (!response.ok) {
			const error = await response.text();
			return failure(error || `HTTP ${response.status}`);
		}

		const data = await response.json();
		return success(data);
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Network error');
	}
}

/**
 * Export assignment statistics as CSV
 */
export async function exportAssignmentStatistics(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<Blob>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	try {
		const token = await currentUser.getIdToken();
		const response = await fetch(
			`${config.backendBaseUrl}/api/assignments/${assignmentId}/statistics/export`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'text/csv'
				}
			}
		);

		if (!response.ok) {
			const error = await response.text();
			return failure(error || `HTTP ${response.status}`);
		}

		const blob = await response.blob();
		return success(blob);
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Network error');
	}
}

/**
 * Get conversation summary for analytics
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

		// Calculate analytics
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
 * Get real-time completion status for an assignment
 * This queries Firestore directly for live data
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

		// Note: notStarted would need roster data to calculate accurately
		return {
			completed,
			inProgress,
			notStarted: 0 // Would need roster query
		};
	});
}
