/**
 * Direct Access Layer - Firestore SDK Operations
 *
 * These operations execute directly against Firestore using the client SDK.
 * Security is enforced by Firestore Security Rules.
 *
 * Benefits:
 * - Lower latency (no server roundtrip)
 * - Real-time capabilities via onSnapshot
 * - Reduced server load
 *
 * Use for simple CRUD where:
 * - Data can be read directly from Firestore
 * - Security rules can enforce access control
 * - No complex server-side logic is needed
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	limit,
	type Firestore,
	type QueryConstraint
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
	Assignments,
	Conversations,
	Courses,
	Topics,
	UserProfiles,
	Wallets,
	AssignmentSubmissions,
	type Assignment,
	type Conversation,
	type CourseDoc,
	type Topic,
	type UserProfile,
	type Wallet,
	type Submission
} from 'mentora-firebase';
import { success, failure, tryCatch, type APIResult, type QueryOptions } from '../types.js';

/**
 * Direct access context
 */
export interface DirectAccessContext {
	db: Firestore;
	getCurrentUser: () => User | null;
}

// ============ User Profiles ============

/**
 * Get a user profile by ID (direct Firestore access)
 */
export async function getProfile(
	ctx: DirectAccessContext,
	uid: string
): Promise<APIResult<UserProfile>> {
	return tryCatch(async () => {
		const docRef = doc(ctx.db, UserProfiles.docPath(uid));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Profile not found');
		}

		return UserProfiles.schema.parse(snapshot.data());
	});
}

/**
 * Update current user's profile (direct Firestore access)
 */
export async function updateProfile(
	ctx: DirectAccessContext,
	updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<APIResult<void>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const docRef = doc(ctx.db, UserProfiles.docPath(user.uid));
		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});
	});
}

// ============ Courses ============

/**
 * Get a course by ID (direct Firestore access)
 */
export async function getCourse(
	ctx: DirectAccessContext,
	courseId: string
): Promise<APIResult<CourseDoc>> {
	return tryCatch(async () => {
		const docRef = doc(ctx.db, Courses.docPath(courseId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Course not found');
		}

		return Courses.schema.parse(snapshot.data());
	});
}

/**
 * List courses for current user (direct Firestore access)
 */
export async function listMyCourses(
	ctx: DirectAccessContext,
	options?: QueryOptions
): Promise<APIResult<CourseDoc[]>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [
			where('ownerId', '==', user.uid),
			orderBy('createdAt', 'desc')
		];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(collection(ctx.db, Courses.collectionPath()), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => Courses.schema.parse(doc.data()));
	});
}

/**
 * Create a course (direct Firestore access)
 */
export async function createCourse(
	ctx: DirectAccessContext,
	data: { title: string; code?: string; visibility?: string }
): Promise<APIResult<CourseDoc>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const now = Date.now();
		const courseRef = doc(collection(ctx.db, Courses.collectionPath()));
		const courseId = courseRef.id;

		const course: CourseDoc = Courses.schema.parse({
			id: courseId,
			title: data.title,
			code:
				data.code?.toUpperCase() ||
				`${data.title.substring(0, 3).toUpperCase()}${now.toString(36).toUpperCase()}`,
			ownerId: user.uid,
			visibility: data.visibility || 'private',
			passwordHash: null,
			theme: null,
			description: null,
			thumbnail: null,
			isDemo: false,
			demoPolicy: null,
			createdAt: now,
			updatedAt: now
		});

		await setDoc(courseRef, course);

		// Add owner as instructor in roster
		const rosterRef = doc(ctx.db, Courses.roster.docPath(courseId, user.uid));
		await setDoc(rosterRef, {
			userId: user.uid,
			email: user.email || '',
			role: 'instructor',
			status: 'active',
			joinedAt: now
		});

		return course;
	});
}

/**
 * Update a course (direct Firestore access)
 */
export async function updateCourse(
	ctx: DirectAccessContext,
	courseId: string,
	updates: Partial<Omit<CourseDoc, 'id' | 'ownerId' | 'createdAt'>>
): Promise<APIResult<CourseDoc>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const docRef = doc(ctx.db, Courses.docPath(courseId));
		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});

		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) throw new Error('Course not found');

		return Courses.schema.parse(snapshot.data());
	});
}

/**
 * Delete a course (direct Firestore access)
 */
export async function deleteCourse(
	ctx: DirectAccessContext,
	courseId: string
): Promise<APIResult<void>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const docRef = doc(ctx.db, Courses.docPath(courseId));
		await deleteDoc(docRef);
	});
}

// ============ Topics ============

/**
 * Get a topic by ID (direct Firestore access)
 */
export async function getTopic(
	ctx: DirectAccessContext,
	topicId: string
): Promise<APIResult<Topic>> {
	return tryCatch(async () => {
		const docRef = doc(ctx.db, Topics.docPath(topicId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Topic not found');
		}

		return Topics.schema.parse(snapshot.data());
	});
}

/**
 * List topics for a course (direct Firestore access)
 */
export async function listCourseTopics(
	ctx: DirectAccessContext,
	courseId: string,
	options?: QueryOptions
): Promise<APIResult<Topic[]>> {
	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [
			where('courseId', '==', courseId),
			orderBy('order', 'asc')
		];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(collection(ctx.db, Topics.collectionPath()), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => Topics.schema.parse(doc.data()));
	});
}

/**
 * Create a topic (direct Firestore access)
 */
export async function createTopic(
	ctx: DirectAccessContext,
	data: Omit<Topic, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<APIResult<Topic>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const now = Date.now();
		const docRef = doc(collection(ctx.db, Topics.collectionPath()));

		const topic: Topic = {
			...data,
			id: docRef.id,
			createdBy: user.uid,
			createdAt: now,
			updatedAt: now
		};

		await setDoc(docRef, topic);

		return topic;
	});
}

/**
 * Update a topic (direct Firestore access)
 */
export async function updateTopic(
	ctx: DirectAccessContext,
	topicId: string,
	updates: Partial<Omit<Topic, 'id' | 'courseId' | 'createdBy' | 'createdAt'>>
): Promise<APIResult<void>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const docRef = doc(ctx.db, Topics.docPath(topicId));
		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});
	});
}

/**
 * Delete a topic (direct Firestore access)
 */
export async function deleteTopic(
	ctx: DirectAccessContext,
	topicId: string
): Promise<APIResult<void>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const docRef = doc(ctx.db, Topics.docPath(topicId));
		await deleteDoc(docRef);
	});
}

// ============ Assignments ============

/**
 * Get an assignment by ID (direct Firestore access)
 */
export async function getAssignment(
	ctx: DirectAccessContext,
	assignmentId: string
): Promise<APIResult<Assignment>> {
	return tryCatch(async () => {
		const docRef = doc(ctx.db, Assignments.docPath(assignmentId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Assignment not found');
		}

		return Assignments.schema.parse(snapshot.data());
	});
}

/**
 * List assignments for a course (direct Firestore access)
 */
export async function listCourseAssignments(
	ctx: DirectAccessContext,
	courseId: string,
	options?: QueryOptions
): Promise<APIResult<Assignment[]>> {
	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [
			where('courseId', '==', courseId),
			orderBy('startAt', 'desc')
		];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(collection(ctx.db, Assignments.collectionPath()), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => Assignments.schema.parse(doc.data()));
	});
}

/**
 * Create an assignment (direct Firestore access)
 */
export async function createAssignment(
	ctx: DirectAccessContext,
	data: Omit<Assignment, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<APIResult<Assignment>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const now = Date.now();
		const docRef = doc(collection(ctx.db, Assignments.collectionPath()));

		const assignment: Assignment = {
			...data,
			id: docRef.id,
			createdBy: user.uid,
			createdAt: now,
			updatedAt: now
		};

		await setDoc(docRef, assignment);

		return assignment;
	});
}

/**
 * Update an assignment (direct Firestore access)
 */
export async function updateAssignment(
	ctx: DirectAccessContext,
	assignmentId: string,
	updates: Partial<Omit<Assignment, 'id' | 'createdBy' | 'createdAt'>>
): Promise<APIResult<Assignment>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const docRef = doc(ctx.db, Assignments.docPath(assignmentId));
		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});

		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) throw new Error('Assignment not found');

		return Assignments.schema.parse(snapshot.data());
	});
}

/**
 * Delete an assignment (direct Firestore access)
 */
export async function deleteAssignment(
	ctx: DirectAccessContext,
	assignmentId: string
): Promise<APIResult<void>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const docRef = doc(ctx.db, Assignments.docPath(assignmentId));
		await deleteDoc(docRef);
	});
}

// ============ Conversations ============

/**
 * Get a conversation by ID (direct Firestore access)
 */
export async function getConversation(
	ctx: DirectAccessContext,
	conversationId: string
): Promise<APIResult<Conversation>> {
	return tryCatch(async () => {
		const docRef = doc(ctx.db, Conversations.docPath(conversationId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Conversation not found');
		}

		return Conversations.schema.parse(snapshot.data());
	});
}

/**
 * Get conversation for an assignment (direct Firestore access)
 */
export async function getAssignmentConversation(
	ctx: DirectAccessContext,
	assignmentId: string,
	userId?: string
): Promise<APIResult<Conversation>> {
	const user = ctx.getCurrentUser();
	const targetUserId = userId || user?.uid;

	if (!targetUserId) return failure('Not authenticated');

	return tryCatch(async () => {
		const q = query(
			collection(ctx.db, Conversations.collectionPath()),
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

// ============ Submissions ============

/**
 * Get a submission (direct Firestore access)
 */
export async function getSubmission(
	ctx: DirectAccessContext,
	assignmentId: string,
	userId: string
): Promise<APIResult<Submission>> {
	return tryCatch(async () => {
		const docRef = doc(ctx.db, AssignmentSubmissions.docPath(assignmentId, userId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Submission not found');
		}

		return AssignmentSubmissions.schema.parse(snapshot.data());
	});
}

/**
 * Get current user's submission (direct Firestore access)
 */
export async function getMySubmission(
	ctx: DirectAccessContext,
	assignmentId: string
): Promise<APIResult<Submission>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return getSubmission(ctx, assignmentId, user.uid);
}

// ============ Wallets (Read-only) ============

/**
 * Get a wallet by ID (direct Firestore access)
 */
export async function getWallet(
	ctx: DirectAccessContext,
	walletId: string
): Promise<APIResult<Wallet>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const docRef = doc(ctx.db, Wallets.docPath(walletId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Wallet not found');
		}

		return Wallets.schema.parse(snapshot.data());
	});
}

/**
 * Get current user's wallet (direct Firestore access)
 */
export async function getMyWallet(ctx: DirectAccessContext): Promise<APIResult<Wallet | null>> {
	const user = ctx.getCurrentUser();
	if (!user) return failure('Not authenticated');

	return tryCatch(async () => {
		const q = query(
			collection(ctx.db, Wallets.collectionPath()),
			where('ownerId', '==', user.uid),
			where('ownerType', '==', 'user'),
			limit(1)
		);

		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			return null;
		}

		return Wallets.schema.parse(snapshot.docs[0].data());
	});
}
