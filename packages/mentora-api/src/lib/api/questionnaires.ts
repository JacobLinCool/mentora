/**
 * Questionnaire operations
 */
import { collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Questionnaires, type Questionnaire } from 'mentora-firebase';
import { callBackend } from './backend.js';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
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
 * List questionnaires for a course (via backend)
 */
export async function listCourseQuestionnaires(
	config: MentoraAPIConfig,
	courseId: string,
	options?: QueryOptions
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
	options?: QueryOptions
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

/**
 * Submit a response to a questionnaire
 */
export async function submitResponse(
	config: MentoraAPIConfig,
	questionnaireId: string,
	responses: Questionnaire['responses']
): Promise<APIResult<void>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Questionnaires.docPath(questionnaireId));

		await updateDoc(docRef, {
			responses,
			updatedAt: Date.now()
		});
	});
}
