/**
 * Questionnaire operations
 */
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	onSnapshot,
	query,
	setDoc,
	updateDoc,
	where
} from 'firebase/firestore';
import { Questionnaires, type Questionnaire } from 'mentora-firebase';
import { callBackend } from './backend.js';
import type { ReactiveState } from './state.svelte.js';
import {
	failure,
	tryCatch,
	type APIResult,
	type ListOptions,
	type MentoraAPIConfig
} from './types.js';

/**
 * Get a questionnaire by ID
 */
export async function getQuestionnaire(
	config: MentoraAPIConfig,
	questionnaireId: string
): Promise<APIResult<Questionnaire>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Questionnaires.docPath(questionnaireId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Questionnaire not found');
		}

		return Questionnaires.schema.parse(snapshot.data());
	});
}

/**
 * Subscribe to questionnaires for a course
 */
export function subscribeToCourseQuestionnaires(
	config: MentoraAPIConfig,
	courseId: string,
	state: ReactiveState<Questionnaire[]>
): void {
	state.setLoading(true);
	const q = query(
		collection(config.db, Questionnaires.collectionPath()),
		where('courseId', '==', courseId)
	);

	const unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			try {
				const data = snapshot.docs.map((doc) => Questionnaires.schema.parse(doc.data()));
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
 * List questionnaires for a course (via backend)
 */
export async function listCourseQuestionnaires(
	config: MentoraAPIConfig,
	courseId: string,
	options?: ListOptions
): Promise<APIResult<Questionnaire[]>> {
	const params = new URLSearchParams({ courseId });
	if (options?.limit) {
		params.set('limit', options.limit.toString());
	}

	const result = await callBackend<unknown[]>(config, `/questionnaires?${params}`);
	if (!result.success) {
		return result;
	}

	return {
		success: true,
		data: result.data.map((q: unknown) => Questionnaires.schema.parse(q))
	};
}

/**
 * List available questionnaires for a course (via backend)
 * Available means startAt <= now
 */
export async function listAvailableQuestionnaires(
	config: MentoraAPIConfig,
	courseId: string,
	options?: ListOptions
): Promise<APIResult<Questionnaire[]>> {
	const params = new URLSearchParams({ courseId, available: 'true' });
	if (options?.limit) {
		params.set('limit', options.limit.toString());
	}

	const result = await callBackend<unknown[]>(config, `/questionnaires?${params}`);
	if (!result.success) {
		return result;
	}

	return {
		success: true,
		data: result.data.map((q: unknown) => Questionnaires.schema.parse(q))
	};
}

/**
 * Create a new questionnaire
 */
export async function createQuestionnaire(
	config: MentoraAPIConfig,
	questionnaire: Omit<Questionnaire, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<APIResult<string>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const now = Date.now();
		const docRef = doc(collection(config.db, Questionnaires.collectionPath()));
		const questionnaireData: Questionnaire = {
			...questionnaire,
			id: docRef.id,
			createdBy: currentUser.uid,
			createdAt: now,
			updatedAt: now
		};

		// Validate against schema before sending
		Questionnaires.schema.parse(questionnaireData);

		await setDoc(docRef, questionnaireData);

		return docRef.id;
	});
}

/**
 * Update a questionnaire
 */
export async function updateQuestionnaire(
	config: MentoraAPIConfig,
	questionnaireId: string,
	updates: Partial<Omit<Questionnaire, 'id' | 'createdBy' | 'createdAt'>>
): Promise<APIResult<Questionnaire>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Questionnaires.docPath(questionnaireId));

		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});

		// Return updated questionnaire
		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) {
			throw new Error('Questionnaire not found');
		}

		return Questionnaires.schema.parse(snapshot.data());
	});
}

/**
 * Delete a questionnaire
 */
export async function deleteQuestionnaire(
	config: MentoraAPIConfig,
	questionnaireId: string
): Promise<APIResult<void>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Questionnaires.docPath(questionnaireId));
		await deleteDoc(docRef);
	});
}
