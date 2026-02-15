import type { Firestore } from 'fires2rest';
import {
	AssignmentSubmissions,
	Assignments,
	Conversations,
	Courses,
	joinPath,
	type Assignment,
	type Conversation,
	type ConversationTokenUsage,
	type CourseMembership,
	type Submission,
	type TokenUsageTotals,
	type Turn
} from 'mentora-firebase';
import { mergeTokenUsageReports, type TokenUsageReport } from '../../llm/token-usage.js';
import type { IConversationRepository } from '../ports/conversation-repository.js';

type FirestoreDocSnapshot = {
	exists: boolean;
	data(): unknown;
};

type FirestoreTransaction = {
	get(ref: unknown): Promise<FirestoreDocSnapshot>;
	update(ref: unknown, data: unknown): void;
};

function hasTokenUsage(usage: TokenUsageTotals): boolean {
	return usage.totalTokenCount > 0 || usage.inputTokenCount > 0 || usage.outputTokenCount > 0;
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

export class FirestoreConversationRepository implements IConversationRepository {
	constructor(private readonly firestore: Firestore) {}

	async getAssignment(assignmentId: string): Promise<Assignment | null> {
		const doc = await this.firestore.doc(Assignments.docPath(assignmentId)).get();
		if (!doc.exists) {
			return null;
		}
		return Assignments.schema.parse(doc.data());
	}

	async getConversation(conversationId: string): Promise<Conversation | null> {
		const doc = await this.firestore.doc(Conversations.docPath(conversationId)).get();
		if (!doc.exists) {
			return null;
		}
		return Conversations.schema.parse(doc.data());
	}

	async createConversation(conversationId: string, conversation: Conversation): Promise<void> {
		await this.firestore
			.doc(Conversations.docPath(conversationId))
			.set(Conversations.schema.parse(conversation));
	}

	async updateConversation(
		conversationId: string,
		updates: Partial<Pick<Conversation, 'state' | 'lastActionAt' | 'updatedAt'>>
	): Promise<void> {
		await this.firestore.doc(Conversations.docPath(conversationId)).update(updates);
	}

	async deleteConversationState(conversationId: string): Promise<void> {
		try {
			await this.firestore
				.doc(joinPath('conversations', conversationId, 'metadata', 'state'))
				.delete();
		} catch {
			// No-op: missing state doc is expected.
		}
	}

	async getMembership(courseId: string, userId: string): Promise<CourseMembership | null> {
		const doc = await this.firestore.doc(Courses.roster.docPath(courseId, userId)).get();
		if (!doc.exists) {
			return null;
		}
		return Courses.roster.schema.parse(doc.data());
	}

	async getSubmission(assignmentId: string, userId: string): Promise<Submission | null> {
		const doc = await this.firestore.doc(AssignmentSubmissions.docPath(assignmentId, userId)).get();
		if (!doc.exists) {
			return null;
		}
		return AssignmentSubmissions.schema.parse(doc.data());
	}

	async saveSubmission(
		assignmentId: string,
		userId: string,
		submission: Submission
	): Promise<void> {
		await this.firestore
			.doc(AssignmentSubmissions.docPath(assignmentId, userId))
			.set(AssignmentSubmissions.schema.parse(submission));
	}

	async appendTurns(params: {
		conversationId: string;
		userId: string;
		turns: Turn[];
		ended: boolean;
		finalNow: number;
		usageReport: TokenUsageReport;
	}): Promise<void> {
		const conversationRef = this.firestore.doc(Conversations.docPath(params.conversationId));
		await this.firestore.runTransaction(async (transaction: FirestoreTransaction) => {
			const latestConversationDoc = await transaction.get(conversationRef);
			if (!latestConversationDoc.exists) {
				throw new Error('Conversation not found');
			}

			const latestConversation = Conversations.schema.parse(latestConversationDoc.data());
			if (latestConversation.userId !== params.userId) {
				throw new Error('Not authorized');
			}
			if (latestConversation.state === 'closed') {
				throw new Error('Conversation is closed');
			}

			const conversationState = params.ended ? 'closed' : latestConversation.state;
			const conversationTokenUsage = toConversationTokenUsage(
				latestConversation.tokenUsage,
				params.usageReport,
				params.finalNow
			);

			transaction.update(conversationRef, {
				turns: [...latestConversation.turns, ...params.turns],
				state: conversationState,
				lastActionAt: params.finalNow,
				updatedAt: params.finalNow,
				tokenUsage: conversationTokenUsage
			});
		});
	}
}
