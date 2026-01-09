/**
 * Assignment operations
 */
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	setDoc,
	updateDoc,
	where,
	type QueryConstraint
} from 'firebase/firestore';
import { Assignments, type Assignment } from 'mentora-firebase';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
} from './types.js';

/**
 * Get an assignment by ID
 */
export async function getAssignment(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<Assignment>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Assignments.docPath(assignmentId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Assignment not found');
		}

		return Assignments.schema.parse(snapshot.data());
	});
}

/**
 * List assignments for a course
 */
export async function listCourseAssignments(
	config: MentoraAPIConfig,
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

		const q = query(collection(config.db, Assignments.collectionPath()), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => Assignments.schema.parse(doc.data()));
	});
}

/**
 * List available assignments for a course (already started)
 */
export async function listAvailableAssignments(
	config: MentoraAPIConfig,
	courseId: string,
	options?: QueryOptions
): Promise<APIResult<Assignment[]>> {
	return tryCatch(async () => {
		const now = Date.now();
		const constraints: QueryConstraint[] = [
			where('courseId', '==', courseId),
			where('startAt', '<=', now),
			orderBy('startAt', 'desc')
		];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(collection(config.db, Assignments.collectionPath()), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => Assignments.schema.parse(doc.data()));
	});
}

/**
 * Create a new assignment
 */
export async function createAssignment(
	config: MentoraAPIConfig,
	assignment: Omit<Assignment, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<APIResult<string>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const now = Date.now();
		const docRef = doc(collection(config.db, Assignments.collectionPath()));
		const assignmentData: Assignment = {
			...assignment,
			id: docRef.id,
			createdBy: currentUser.uid,
			createdAt: now,
			updatedAt: now
		};

		// Validate against schema before sending
		Assignments.schema.parse(assignmentData);

		await setDoc(docRef, assignmentData);

		return docRef.id;
	});
}

/**
 * Update an assignment
 */
export async function updateAssignment(
	config: MentoraAPIConfig,
	assignmentId: string,
	updates: Partial<Omit<Assignment, 'id' | 'createdBy' | 'createdAt'>>
): Promise<APIResult<Assignment>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Assignments.docPath(assignmentId));

		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});

		// Return updated assignment
		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) {
			throw new Error('Assignment not found');
		}

		return Assignments.schema.parse(snapshot.data());
	});
}

/**
 * Delete an assignment
 */
export async function deleteAssignment(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<void>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Assignments.docPath(assignmentId));
		await deleteDoc(docRef);
	});
}
