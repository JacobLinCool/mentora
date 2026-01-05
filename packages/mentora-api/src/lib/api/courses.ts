/**
 * Course management operations
 */
import {
	collection,
	collectionGroup,
	doc,
	getDoc,
	getDocs,
	setDoc,
	updateDoc,
	deleteDoc,
	limit,
	orderBy,
	query,
	runTransaction,
	where,
	type QueryConstraint
} from 'firebase/firestore';
import {
	Courses,
	type CourseDoc,
	type CourseMembership,
	type JoinCourseResult
} from 'mentora-firebase';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
} from './types.js';

/**
 * Get a course by ID
 */
export async function getCourse(
	config: MentoraAPIConfig,
	courseId: string
): Promise<APIResult<CourseDoc>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Courses.docPath(courseId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Course not found');
		}

		return Courses.schema.parse(snapshot.data());
	});
}

/**
 * List courses owned by current user
 */
export async function listMyCourses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<CourseDoc[]>> {
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

		return snapshot.docs.map((doc) => Courses.schema.parse(doc.data()));
	});
}

/**
 * List courses where current user is a student
 */
export async function listMyEnrolledCourses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<CourseDoc[]>> {
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

		// Fetch each course document
		const courses: CourseDoc[] = [];
		for (const courseId of courseIds) {
			const result = await getCourse(config, courseId);
			if (result.success) {
				courses.push(result.data);
			}
		}

		return courses;
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
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const token = await currentUser.getIdToken();

		const response = await fetch('/api/courses', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				title,
				code,
				...options
			})
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Failed to create course' }));
			throw new Error(error.message || `Failed to create course: ${response.status}`);
		}

		const data = await response.json();
		return data.id;
	});
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
			joinedAt: null
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
): Promise<APIResult<CourseMembership[]>> {
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

		return snapshot.docs.map((doc) => Courses.roster.schema.parse(doc.data()));
	});
}

/**
 * List public courses (for discovery/demo)
 */
export async function listPublicCourses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<CourseDoc[]>> {
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

		return snapshot.docs.map((doc) => Courses.schema.parse(doc.data()));
	});
}

/**
 * List courses where current user is enrolled (student or auditor)
 */
export async function listAllEnrolledCourses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<CourseDoc[]>> {
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

		// Fetch each course document
		const courses: CourseDoc[] = [];
		for (const courseId of courseIds) {
			const result = await getCourse(config, courseId);
			if (result.success) {
				courses.push(result.data);
			}
		}

		return courses;
	});
}

/**
 * Update a course
 */
export async function updateCourse(
	config: MentoraAPIConfig,
	courseId: string,
	updates: Partial<Omit<CourseDoc, 'id' | 'ownerId' | 'createdAt'>>
): Promise<APIResult<CourseDoc>> {
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

		return Courses.schema.parse(snapshot.data());
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

		// Check if trying to modify owner
		const memberData = memberDoc.data();
		if (memberData?.role === 'owner') {
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

		// Check if trying to remove owner
		const memberData = memberDoc.data();
		if (memberData?.role === 'owner') {
			throw new Error('Cannot remove course owner');
		}

		// Soft delete by setting status to 'removed'
		await updateDoc(memberRef, {
			status: 'removed'
		});
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
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const token = await currentUser.getIdToken();

		const response = await fetch('/api/courses/join', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ code })
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Failed to join course' }));
			throw new Error(error.message || `Failed to join course: ${response.status}`);
		}

		return await response.json();
	});
}
