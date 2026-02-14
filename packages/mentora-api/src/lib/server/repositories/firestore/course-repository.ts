import type { Firestore } from 'fires2rest';
import {
	Assignments,
	Courses,
	Questionnaires,
	Topics,
	type Assignment,
	type CourseDoc,
	type CourseMembership,
	type Questionnaire,
	type Topic
} from 'mentora-firebase';
import type {
	CopyCourseParams,
	CourseContentSnapshot,
	CourseQueryResult,
	CreateCourseParams,
	CreateCourseResult,
	ICourseRepository
} from '../ports/course-repository.js';

const COURSE_CODE_LOCKS_COLLECTION = '_courseCodeLocks';

type FirestoreDocSnapshot = {
	exists: boolean;
	data(): unknown;
};

type FirestoreTransaction = {
	get(ref: unknown): Promise<FirestoreDocSnapshot>;
	set(ref: unknown, data: unknown): void;
	update(ref: unknown, data: unknown): void;
};

export class FirestoreCourseRepository implements ICourseRepository {
	constructor(private readonly firestore: Firestore) {}

	async getCourseById(courseId: string): Promise<CourseDoc | null> {
		const doc = await this.firestore.doc(Courses.docPath(courseId)).get();
		if (!doc.exists) {
			return null;
		}
		return Courses.schema.parse(doc.data());
	}

	async findCourseByCode(code: string): Promise<CourseQueryResult | null> {
		const snapshot = await this.firestore
			.collection(Courses.collectionPath())
			.where('code', '==', code)
			.limit(1)
			.get();
		if (snapshot.empty) {
			return null;
		}
		const doc = snapshot.docs[0];
		return {
			id: doc.id,
			data: Courses.schema.parse(doc.data())
		};
	}

	async getMembership(courseId: string, userId: string): Promise<CourseMembership | null> {
		const membershipDoc = await this.firestore.doc(Courses.roster.docPath(courseId, userId)).get();
		if (!membershipDoc.exists) {
			return null;
		}
		return Courses.roster.schema.parse(membershipDoc.data());
	}

	async createCourseWithCodeLock(params: CreateCourseParams): Promise<CreateCourseResult> {
		// Fast duplicate check for legacy rows without lock docs.
		const existingCourse = await this.firestore
			.collection(Courses.collectionPath())
			.where('code', '==', params.code)
			.limit(1)
			.get();
		if (!existingCourse.empty) {
			return { courseId: '', duplicateCode: true };
		}

		const transactionResult = await this.firestore.runTransaction(
			async (transaction: FirestoreTransaction) => {
				const lockRef = this.firestore.collection(COURSE_CODE_LOCKS_COLLECTION).doc(params.code);
				const lockDoc = await transaction.get(lockRef);
				if (lockDoc.exists) {
					return { courseId: '', duplicateCode: true };
				}

				const courseRef = this.firestore.collection(Courses.collectionPath()).doc();
				const courseId = courseRef.id;

				const course: CourseDoc = {
					title: params.title,
					code: params.code,
					ownerId: params.ownerId,
					visibility: params.visibility,
					passwordHash: null,
					theme: params.theme,
					description: params.description,
					thumbnail: null,
					isDemo: params.isDemo,
					demoPolicy: params.demoPolicy,
					createdAt: params.now,
					updatedAt: params.now,
					announcements: []
				};

				transaction.set(courseRef, Courses.schema.parse(course));
				transaction.set(lockRef, {
					code: params.code,
					courseId,
					createdAt: params.now,
					ownerId: params.ownerId
				});

				const membershipRef = this.firestore.doc(Courses.roster.docPath(courseId, params.ownerId));
				const membership: CourseMembership = {
					userId: params.ownerId,
					email: params.ownerEmail,
					role: 'instructor',
					status: 'active',
					joinedAt: params.now
				};
				transaction.set(membershipRef, Courses.roster.schema.parse(membership));

				return { courseId, duplicateCode: false };
			}
		);

		return transactionResult as CreateCourseResult;
	}

	async createCopiedCourse(params: CopyCourseParams): Promise<void> {
		const newCourse: CourseDoc = {
			...params.sourceCourse,
			title: params.title,
			code: params.newCourseCode,
			ownerId: params.newOwnerId,
			visibility: 'private',
			announcements: [],
			isDemo: params.isDemo,
			createdAt: params.now,
			updatedAt: params.now
		};
		await this.firestore
			.doc(Courses.docPath(params.newCourseId))
			.set(Courses.schema.parse(newCourse));

		const ownerMembership: CourseMembership = {
			userId: params.newOwnerId,
			email: params.newOwnerEmail,
			role: 'instructor',
			status: 'active',
			joinedAt: params.now
		};
		await this.upsertMembership(params.newCourseId, params.newOwnerId, ownerMembership);
	}

	async upsertMembership(
		courseId: string,
		memberId: string,
		membership: CourseMembership
	): Promise<void> {
		await this.firestore
			.doc(Courses.roster.docPath(courseId, memberId))
			.set(Courses.roster.schema.parse(membership));
	}

	async updateMembership(
		courseId: string,
		memberId: string,
		updates: Partial<Pick<CourseMembership, 'status' | 'joinedAt'>>
	): Promise<void> {
		await this.firestore.doc(Courses.roster.docPath(courseId, memberId)).update(updates);
	}

	async listRosterByRoles(
		courseId: string,
		roles: CourseMembership['role'][]
	): Promise<CourseMembership[]> {
		if (roles.length === 0) {
			return [];
		}
		const snapshot = await this.firestore
			.collection(Courses.roster.collectionPath(courseId))
			.where('role', 'in', roles)
			.get();
		return snapshot.docs.map((doc) => Courses.roster.schema.parse(doc.data()));
	}

	async loadCourseContent(courseId: string): Promise<CourseContentSnapshot> {
		const [topicsSnapshot, assignmentsSnapshot, questionnairesSnapshot] = await Promise.all([
			this.firestore.collection(Topics.collectionPath()).where('courseId', '==', courseId).get(),
			this.firestore
				.collection(Assignments.collectionPath())
				.where('courseId', '==', courseId)
				.get(),
			this.firestore
				.collection(Questionnaires.collectionPath())
				.where('courseId', '==', courseId)
				.get()
		]);

		return {
			topics: topicsSnapshot.docs.map((doc) => Topics.schema.parse(doc.data())),
			assignments: assignmentsSnapshot.docs.map((doc) => Assignments.schema.parse(doc.data())),
			questionnaires: questionnairesSnapshot.docs.map((doc) =>
				Questionnaires.schema.parse(doc.data())
			)
		};
	}

	allocateCourseId(): string {
		return this.firestore.collection(Courses.collectionPath()).doc().id;
	}

	allocateTopicId(): string {
		return this.firestore.collection(Topics.collectionPath()).doc().id;
	}

	allocateAssignmentId(): string {
		return this.firestore.collection(Assignments.collectionPath()).doc().id;
	}

	allocateQuestionnaireId(): string {
		return this.firestore.collection(Questionnaires.collectionPath()).doc().id;
	}

	async saveTopic(topicId: string, topic: Topic): Promise<void> {
		await this.firestore.doc(Topics.docPath(topicId)).set(Topics.schema.parse(topic));
	}

	async saveAssignment(assignmentId: string, assignment: Assignment): Promise<void> {
		await this.firestore
			.doc(Assignments.docPath(assignmentId))
			.set(Assignments.schema.parse(assignment));
	}

	async saveQuestionnaire(questionnaireId: string, questionnaire: Questionnaire): Promise<void> {
		await this.firestore
			.doc(Questionnaires.docPath(questionnaireId))
			.set(Questionnaires.schema.parse(questionnaire));
	}

	async listTopicsByCourse(courseId: string, limit?: number): Promise<Topic[]> {
		let query = this.firestore
			.collection(Topics.collectionPath())
			.where('courseId', '==', courseId)
			.orderBy('order', 'asc');

		if (limit && limit > 0) {
			query = query.limit(limit);
		}

		const snapshot = await query.get();
		return snapshot.docs.map((doc) => Topics.schema.parse(doc.data()));
	}

	async listAssignmentsByCourse(
		courseId: string,
		available: boolean,
		limit?: number
	): Promise<Assignment[]> {
		let query = this.firestore
			.collection(Assignments.collectionPath())
			.where('courseId', '==', courseId);

		if (available) {
			query = query.where('startAt', '<=', Date.now());
		}

		query = query.orderBy('startAt', 'desc');
		if (limit && limit > 0) {
			query = query.limit(limit);
		}

		const snapshot = await query.get();
		return snapshot.docs.map((doc) => Assignments.schema.parse(doc.data()));
	}

	async listQuestionnairesByCourse(
		courseId: string,
		available: boolean,
		limit?: number
	): Promise<Questionnaire[]> {
		let query = this.firestore
			.collection(Questionnaires.collectionPath())
			.where('courseId', '==', courseId);

		if (available) {
			query = query.where('startAt', '<=', Date.now());
		}

		query = query.orderBy('startAt', 'desc');
		if (limit && limit > 0) {
			query = query.limit(limit);
		}

		const snapshot = await query.get();
		return snapshot.docs.map((doc) => Questionnaires.schema.parse(doc.data()));
	}
}
