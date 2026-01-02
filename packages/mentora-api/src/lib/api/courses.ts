/**
 * Course management operations
 */
import {
	collection,
	collectionGroup,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	runTransaction,
	where,
	type QueryConstraint
} from 'firebase/firestore';
import { Courses, type CourseDoc, type CourseMembership } from 'mentora-firebase';
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
 * Create a new course
 * Creates both the course document and the owner's roster entry atomically
 */
export async function createCourse(
	config: MentoraAPIConfig,
	title: string,
	code: string
): Promise<APIResult<string>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const now = Date.now();

		// Pre-generate document reference to get the ID
		const courseRef = doc(collection(config.db, Courses.collectionPath()));
		const courseId = courseRef.id;
		const courseData = Courses.schema.parse({
			id: courseId,
			title,
			code,
			ownerId: currentUser.uid,
			createdAt: now,
			updatedAt: now
		});

		const rosterRef = doc(config.db, Courses.roster.docPath(courseId, currentUser.uid));
		const rosterData = Courses.roster.schema.parse({
			userId: currentUser.uid,
			email: currentUser.email || '',
			role: 'instructor',
			status: 'active',
			joinedAt: now
		} satisfies CourseMembership);

		// Use transaction to ensure atomicity
		await runTransaction(config.db, async (transaction) => {
			// Create course document
			transaction.set(courseRef, courseData);

			// Create owner's roster entry as instructor
			transaction.set(rosterRef, rosterData);
		});

		return courseId;
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
