import type {
	Assignment,
	ClassReport,
	Conversation,
	CourseMembership,
	DialogueStateDisplay,
	Submission,
	TokenUsageTotals
} from 'mentora-firebase';

export interface IAnalyticsRepository {
	listOwnedCourseIds(ownerId: string): Promise<string[]>;
	listActiveRoster(courseId: string): Promise<CourseMembership[]>;
	listAssignmentsByCourse(courseId: string): Promise<Assignment[]>;
	listSubmissionsByAssignment(assignmentId: string): Promise<Submission[]>;
	listConversationsByAssignment(assignmentId: string): Promise<(Conversation & { id: string })[]>;
	getDialogueState(conversationId: string): Promise<DialogueStateDisplay | null>;
	getAssignment(assignmentId: string): Promise<Assignment | null>;
	updateAssignmentClassReport(assignmentId: string, classReport: ClassReport): Promise<void>;
}

export interface TokenUsageAggregateBucket {
	date: string;
	totals: TokenUsageTotals;
	byFeature: Record<string, TokenUsageTotals>;
}
