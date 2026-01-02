/**
 * Submission operations
 */
import {
	collection,
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
import { AssignmentSubmissions, type Submission } from 'mentora-firebase';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
} from './types.js';

/**
 * Get a submission
 */
export async function getSubmission(
	config: MentoraAPIConfig,
	assignmentId: string,
	userId: string
): Promise<APIResult<Submission>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, AssignmentSubmissions.docPath(assignmentId, userId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Submission not found');
		}

		return AssignmentSubmissions.schema.parse(snapshot.data());
	});
}

/**
 * Get current user's submission for an assignment
 */
export async function getMySubmission(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<Submission>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return getSubmission(config, assignmentId, currentUser.uid);
}

/**
 * List all submissions for an assignment
 */
export async function listAssignmentSubmissions(
	config: MentoraAPIConfig,
	assignmentId: string,
	options?: QueryOptions
): Promise<APIResult<Submission[]>> {
	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [];

		if (options?.where) {
			for (const w of options.where) {
				constraints.push(where(w.field, w.op, w.value));
			}
		}

		if (options?.orderBy) {
			constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
		} else {
			constraints.push(orderBy('startedAt', 'desc'));
		}

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(
			collection(config.db, AssignmentSubmissions.collectionPath(assignmentId)),
			...constraints
		);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => AssignmentSubmissions.schema.parse(doc.data()));
	});
}

/**
 * Start a submission
 */
export async function startSubmission(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<void>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const docRef = doc(config.db, AssignmentSubmissions.docPath(assignmentId, currentUser.uid));

		const submission: Submission = {
			userId: currentUser.uid,
			state: 'in_progress',
			startedAt: Date.now(),
			submittedAt: null,
			late: false,
			scoreCompletion: null,
			notes: null
		};

		await setDoc(docRef, submission);
	});
}

/**
 * Submit an assignment
 */
export async function submitAssignment(
	config: MentoraAPIConfig,
	assignmentId: string
): Promise<APIResult<void>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const docRef = doc(config.db, AssignmentSubmissions.docPath(assignmentId, currentUser.uid));

		await updateDoc(docRef, {
			state: 'submitted',
			submittedAt: Date.now()
		});
	});
}
