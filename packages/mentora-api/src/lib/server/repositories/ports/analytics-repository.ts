import type {
	Assignment,
	Conversation,
	CourseMembership,
	Submission,
	TokenUsageTotals
} from 'mentora-firebase';

export interface IAnalyticsRepository {
	listOwnedCourseIds(ownerId: string): Promise<string[]>;
	listActiveRoster(courseId: string): Promise<CourseMembership[]>;
	listAssignmentsByCourse(courseId: string): Promise<Assignment[]>;
	listSubmissionsByAssignment(assignmentId: string): Promise<Submission[]>;
	listConversationsByAssignment(assignmentId: string): Promise<Conversation[]>;
}

export interface TokenUsageAggregateBucket {
	date: string;
	totals: TokenUsageTotals;
	byFeature: Record<string, TokenUsageTotals>;
}
