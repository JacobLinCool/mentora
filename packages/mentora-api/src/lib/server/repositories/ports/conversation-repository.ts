import type {
	Assignment,
	Conversation,
	ConversationTokenUsage,
	CourseMembership,
	Submission,
	TokenUsageBreakdown,
	Turn
} from 'mentora-firebase';
import type { TokenUsageReport } from '../../llm/token-usage.js';

export interface IConversationRepository {
	getAssignment(assignmentId: string): Promise<Assignment | null>;
	getConversation(conversationId: string): Promise<Conversation | null>;
	createConversation(conversationId: string, conversation: Conversation): Promise<void>;
	updateConversation(
		conversationId: string,
		updates: Partial<Pick<Conversation, 'state' | 'lastActionAt' | 'updatedAt'>>
	): Promise<void>;
	deleteConversationState(conversationId: string): Promise<void>;
	getMembership(courseId: string, userId: string): Promise<CourseMembership | null>;
	getSubmission(assignmentId: string, userId: string): Promise<Submission | null>;
	saveSubmission(assignmentId: string, userId: string, submission: Submission): Promise<void>;
	appendTurns(params: {
		conversationId: string;
		userId: string;
		turns: Turn[];
		ended: boolean;
		finalNow: number;
		usageReport: TokenUsageReport;
	}): Promise<void>;
}

export interface ConversationTokenUsageConverter {
	toConversationTokenUsage(
		existing: ConversationTokenUsage | null | undefined,
		requestUsage: TokenUsageReport,
		updatedAt: number
	): ConversationTokenUsage | null;
	toTurnTokenUsage(report: TokenUsageReport): TokenUsageBreakdown | null;
}
