/**
 * Assignment operations
 */
import { collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Assignments, type Assignment } from 'mentora-firebase';
import { callBackend } from './backend.js';
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
 * List assignments for a course (via backend)
 */
export async function listCourseAssignments(
	config: MentoraAPIConfig,
	courseId: string,
	options?: QueryOptions
): Promise<APIResult<Assignment[]>> {
	const params = new URLSearchParams({ courseId });
	if (options?.limit) {
		params.set('limit', options.limit.toString());
	}

	const result = await callBackend<unknown[]>(config, `/assignments?${params}`);
	if (!result.success) {
		return result;
	}

	return {
		success: true,
		data: result.data.map((a: unknown) => Assignments.schema.parse(a))
	};
}

/**
 * List available assignments for a course (via backend)
 */
export async function listAvailableAssignments(
	config: MentoraAPIConfig,
	courseId: string,
	options?: QueryOptions
): Promise<APIResult<Assignment[]>> {
	const params = new URLSearchParams({ courseId, available: 'true' });
	if (options?.limit) {
		params.set('limit', options.limit.toString());
	}

	const result = await callBackend<unknown[]>(config, `/assignments?${params}`);
	if (!result.success) {
		return result;
	}

	return {
		success: true,
		data: result.data.map((a: unknown) => Assignments.schema.parse(a))
	};
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
