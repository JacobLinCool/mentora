/**
 * Course management operations
 */
import {
	arrayUnion,
	collection,
	collectionGroup,
	doc,
	getDoc,
	onSnapshot,
	getDocs,
	setDoc,
	updateDoc,
	deleteDoc,
	limit,
	orderBy,
	query,
	Timestamp,
	where,
	type QueryConstraint
} from 'firebase/firestore';
import { Courses, type CourseDoc, type CourseMembership } from 'mentora-firebase';

export type Course = CourseDoc & { id: string };

import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions,
	success
} from './types.js';
import type { ReactiveState } from './state.svelte.js';
import { callBackend } from './backend.js';

export interface JoinCourseResult {
	courseId: string;
	joined: boolean;
	alreadyMember?: boolean;
	rejoined?: boolean;
}

/**
 * Get a course by ID
 */
export async function getCourse(
	config: MentoraAPIConfig,
	courseId: string
): Promise<APIResult<Course>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Courses.docPath(courseId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Course not found');
		}

		return {
			id: snapshot.id,
			...Courses.schema.parse(snapshot.data())
		};
	});
}

/**
 * List courses owned by current user
 */
export async function listMyCourses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<Course[]>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [
			where('ownerId', '==', currentUser.uid),
			orderBy('createdAt', 'desc')
		];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(collection(config.db, Courses.collectionPath()), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => ({
			id: doc.id,
			...Courses.schema.parse(doc.data())
		}));
	});
}

/**
 * Subscribe to courses owned by current user
 */
export function subscribeToMyCourses(
	config: MentoraAPIConfig,
	state: ReactiveState<Course[]>,
	options?: QueryOptions
): void {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		state.setError('Not authenticated');
		state.setLoading(false);
		return;
	}

	state.setLoading(true);

	const constraints: QueryConstraint[] = [
		where('ownerId', '==', currentUser.uid),
		orderBy('createdAt', 'desc')
	];

	if (options?.limit) {
		constraints.push(limit(options.limit));
	}

	if (options?.where) {
		for (const w of options.where) {
			constraints.push(where(w.field, w.op, w.value));
		}
	}

	const q = query(collection(config.db, Courses.collectionPath()), ...constraints);

	const unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			try {
				const data = snapshot.docs.map((doc) => ({
					id: doc.id,
					...Courses.schema.parse(doc.data())
				}));

				state.set(data);
				state.setError(null);
			} catch (error) {
				state.setError(error instanceof Error ? error.message : 'Parse error');
			}
			state.setLoading(false);
		},
		(error) => {
			state.setError(error.message);
			state.setLoading(false);
		}
	);

	state.attachUnsubscribe(unsubscribe);
}

/**
 * List courses where current user is a student
 */
export async function listMyEnrolledCourses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<Course[]>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		// Query roster collection group
		const q = query(
			collectionGroup(config.db, 'roster'),
			where('userId', '==', currentUser.uid),
			where('status', '==', 'active'),
			where('role', '==', 'student'),
			orderBy('joinedAt', 'desc'),
			...(options?.limit ? [limit(options.limit)] : [])
		);

		const snapshot = await getDocs(q);
		const courseIds = snapshot.docs.map((doc) => {
			const parts = doc.ref.path.split('/');
			return parts[1]; // courses/{courseId}/roster/{memberId}
		});

		// Fetch all courses in parallel
		const results = await Promise.all(courseIds.map((courseId) => getCourse(config, courseId)));

		return results
			.filter((result): result is { success: true; data: Course } => result.success)
			.map((result) => result.data);
	});
}

/**
 * Course creation options
 */
export interface CreateCourseOptions {
	visibility?: 'public' | 'unlisted' | 'private';
	description?: string | null;
	theme?: string | null;
	isDemo?: boolean;
	demoPolicy?: { maxFreeCreditsPerUser: number; maxTurnsPerConversation?: number | null } | null;
}

/**
 * Create a new course
 *
 * Delegated to backend to handle code uniqueness validation securely.
 */
export async function createCourse(
	config: MentoraAPIConfig,
	title: string,
	code?: string,
	options?: CreateCourseOptions
): Promise<APIResult<string>> {
	// Use callBackend for consistent error handling and auth
	const result = await callBackend<{ id: string }>(config, '/courses', {
		method: 'POST',
		body: JSON.stringify({
			title,
			code,
			...options
		})
	});

	if (result.success) {
		return success(result.data.id);
	}
	return result;
}

/**
 * Invite a member to a course
 *
 * Creates an invitation entry in the roster.
 * Security Rules verify the user has instructor/owner permission.
 */
export async function inviteMember(
	config: MentoraAPIConfig,
	courseId: string,
	email: string,
	role: 'instructor' | 'student' | 'ta' | 'auditor' = 'student'
): Promise<APIResult<string>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const normalizedEmail = email.toLowerCase().trim();

		// Check if email already has membership
		const existingMembersQuery = query(
			collection(config.db, Courses.roster.collectionPath(courseId)),
			where('email', '==', normalizedEmail),
			limit(1)
		);
		const existingMembers = await getDocs(existingMembersQuery);

		if (!existingMembers.empty) {
			const existing = existingMembers.docs[0].data();
			if (existing?.status === 'active') {
				throw new Error('User is already a member of this course');
			}
			if (existing?.status === 'invited') {
				throw new Error('User has already been invited');
			}
		}

		// Create invitation
		const memberId = `member_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
		const memberRef = doc(config.db, Courses.roster.docPath(courseId, memberId));

		const membership: CourseMembership = {
			userId: null, // Will be set when user accepts invitation
			email: normalizedEmail,
			role,
			status: 'invited',
			joinedAt: null,
			invitedAt: Date.now()
		};

		await setDoc(memberRef, membership);

		return memberId;
	});
}

/**
 * Get course roster
 */
export async function getCourseRoster(
	config: MentoraAPIConfig,
	courseId: string,
	options?: QueryOptions
): Promise<APIResult<(CourseMembership & { id: string })[]>> {
	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [];

		if (options?.where) {
			for (const w of options.where) {
				constraints.push(where(w.field, w.op, w.value));
			}
		}

		if (options?.orderBy) {
			constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
		}

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(collection(config.db, Courses.roster.collectionPath(courseId)), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => ({
			id: doc.id,
			...Courses.roster.schema.parse(doc.data())
		}));
	});
}

/**
 * List public courses (for discovery/demo)
 */
export async function listPublicCourses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<Course[]>> {
	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [
			where('visibility', '==', 'public'),
			orderBy('createdAt', 'desc')
		];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(collection(config.db, Courses.collectionPath()), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => ({
			id: doc.id,
			...Courses.schema.parse(doc.data())
		}));
	});
}

/**
 * List courses where current user is enrolled (student or auditor)
 */
export async function listAllEnrolledCourses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<Course[]>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		// Query roster collection group for both student and auditor roles
		const q = query(
			collectionGroup(config.db, 'roster'),
			where('userId', '==', currentUser.uid),
			where('status', '==', 'active'),
			orderBy('joinedAt', 'desc'),
			...(options?.limit ? [limit(options.limit)] : [])
		);

		const snapshot = await getDocs(q);
		const courseIds = snapshot.docs
			.filter((doc) => {
				const role = doc.data().role;
				return role === 'student' || role === 'auditor';
			})
			.map((doc) => {
				const parts = doc.ref.path.split('/');
				return parts[1]; // courses/{courseId}/roster/{memberId}
			});

		// Fetch all courses in parallel
		const results = await Promise.all(courseIds.map((courseId) => getCourse(config, courseId)));

		return results
			.filter((result): result is { success: true; data: Course } => result.success)
			.map((result) => result.data);
	});
}

/**
 * Update a course
 */
export async function updateCourse(
	config: MentoraAPIConfig,
	courseId: string,
	updates: Partial<Omit<CourseDoc, 'ownerId' | 'createdAt'>>
): Promise<APIResult<Course>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Courses.docPath(courseId));
		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});

		// Return updated course
		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) {
			throw new Error('Course not found');
		}

		return {
			id: snapshot.id,
			...Courses.schema.parse(snapshot.data())
		};
	});
}

/**
 * Delete a course
 */
export async function deleteCourse(
	config: MentoraAPIConfig,
	courseId: string
): Promise<APIResult<void>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Courses.docPath(courseId));
		await deleteDoc(docRef);
	});
}

/**
 * Update a course member's role or status
 *
 * Security Rules verify the user is the course owner.
 */
export async function updateMember(
	config: MentoraAPIConfig,
	courseId: string,
	memberId: string,
	updates: { role?: 'instructor' | 'student' | 'ta' | 'auditor'; status?: 'active' | 'removed' }
): Promise<APIResult<CourseMembership>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const memberRef = doc(config.db, Courses.roster.docPath(courseId, memberId));
		const memberDoc = await getDoc(memberRef);

		if (!memberDoc.exists()) {
			throw new Error('Member not found');
		}

		// Check if trying to modify owner (compare userId against course ownerId)
		const memberData = memberDoc.data();
		const courseRef = doc(config.db, Courses.docPath(courseId));
		const courseSnap = await getDoc(courseRef);
		if (courseSnap.exists() && memberData?.userId === courseSnap.data()?.ownerId) {
			throw new Error('Cannot modify course owner');
		}

		await updateDoc(memberRef, updates);

		const updatedDoc = await getDoc(memberRef);
		return Courses.roster.schema.parse(updatedDoc.data());
	});
}

/**
 * Remove a member from course (soft delete)
 *
 * Security Rules verify the user is owner/instructor or self-removal.
 */
export async function removeMember(
	config: MentoraAPIConfig,
	courseId: string,
	memberId: string
): Promise<APIResult<void>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const memberRef = doc(config.db, Courses.roster.docPath(courseId, memberId));
		const memberDoc = await getDoc(memberRef);

		if (!memberDoc.exists()) {
			throw new Error('Member not found');
		}

		// Check if trying to remove owner (compare userId against course ownerId)
		const memberData = memberDoc.data();
		const courseRef = doc(config.db, Courses.docPath(courseId));
		const courseSnap = await getDoc(courseRef);
		if (courseSnap.exists() && memberData?.userId === courseSnap.data()?.ownerId) {
			throw new Error('Cannot remove course owner');
		}

		// Soft delete by setting status to 'removed'
		await updateDoc(memberRef, {
			status: 'removed'
		});
	});
}

/**
 * Copy a course
 *
 * Delegated to backend to handle deep copying of all resources.
 */
export async function copyCourse(
	config: MentoraAPIConfig,
	courseId: string,
	options: {
		title?: string;
		includeContent?: boolean; // topics, assignments
		includeRoster?: boolean; // instructors, TAs (not students)
		isDemo?: boolean;
	}
): Promise<APIResult<string>> {
	// Use callBackend
	const result = await callBackend<{ id: string }>(config, `/courses/${courseId}/copy`, {
		method: 'POST',
		body: JSON.stringify(options)
	});

	if (result.success) {
		return success(result.data.id);
	}
	return result;
}

/**
 * Create an announcement
 *
 * Appends to the announcements array in the course document.
 */
export async function createAnnouncement(
	config: MentoraAPIConfig,
	courseId: string,
	content: string
): Promise<APIResult<import('mentora-firebase').CourseAnnouncement>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const docRef = doc(config.db, Courses.docPath(courseId));

		const now = Timestamp.now();
		const announcement = {
			id: crypto.randomUUID(),
			content,
			createdAt: now.toMillis(),
			updatedAt: now.toMillis()
		};

		await updateDoc(docRef, {
			announcements: arrayUnion(announcement),
			updatedAt: now.toMillis()
		});

		return announcement;
	});
}

/**
 * Join a course by code
 *
 * Delegated to backend to handle code lookup securely without exposing generic query permissions.
 */
export async function joinByCode(
	config: MentoraAPIConfig,
	code: string
): Promise<APIResult<JoinCourseResult>> {
	return callBackend<JoinCourseResult>(config, '/courses/join', {
		method: 'POST',
		body: JSON.stringify({ code })
	});
}
