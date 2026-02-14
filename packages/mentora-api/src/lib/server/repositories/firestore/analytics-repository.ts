import type { Firestore } from 'fires2rest';
import {
	AssignmentSubmissions,
	Assignments,
	Conversations,
	Courses,
	type Assignment,
	type Conversation,
	type CourseMembership,
	type Submission
} from 'mentora-firebase';
import type { IAnalyticsRepository } from '../ports/analytics-repository.js';

export class FirestoreAnalyticsRepository implements IAnalyticsRepository {
	constructor(private readonly firestore: Firestore) {}

	async listOwnedCourseIds(ownerId: string): Promise<string[]> {
		const snapshot = await this.firestore
			.collection(Courses.collectionPath())
			.where('ownerId', '==', ownerId)
			.get();
		return snapshot.docs.map((doc) => doc.id);
	}

	async listActiveRoster(courseId: string): Promise<CourseMembership[]> {
		const snapshot = await this.firestore
			.collection(Courses.roster.collectionPath(courseId))
			.where('status', '==', 'active')
			.get();
		return snapshot.docs.map((doc) => Courses.roster.schema.parse(doc.data()));
	}

	async listAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
		const snapshot = await this.firestore
			.collection(Assignments.collectionPath())
			.where('courseId', '==', courseId)
			.get();
		return snapshot.docs.map((doc) => Assignments.schema.parse(doc.data()));
	}

	async listSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
		const snapshot = await this.firestore
			.collection(AssignmentSubmissions.collectionPath(assignmentId))
			.get();
		return snapshot.docs.map((doc) => AssignmentSubmissions.schema.parse(doc.data()));
	}

	async listConversationsByAssignment(assignmentId: string): Promise<Conversation[]> {
		const snapshot = await this.firestore
			.collection(Conversations.collectionPath())
			.where('assignmentId', '==', assignmentId)
			.get();
		return snapshot.docs.map((doc) => Conversations.schema.parse(doc.data()));
	}
}
