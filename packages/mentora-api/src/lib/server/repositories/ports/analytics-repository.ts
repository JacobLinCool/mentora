import type {
	Assignment,
	ClassReport,
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
	getAssignment(assignmentId: string): Promise<Assignment | null>;
	updateAssignmentClassReport(assignmentId: string, classReport: ClassReport): Promise<void>;
}

export interface TokenUsageAggregateBucket {
	date: string;
	totals: TokenUsageTotals;
	byFeature: Record<string, TokenUsageTotals>;
}
