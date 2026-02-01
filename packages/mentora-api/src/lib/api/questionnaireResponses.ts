/**
 * Questionnaire response operations
 */
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	query,
	setDoc,
	updateDoc,
	where
} from 'firebase/firestore';
import { QuestionnaireResponses, type QuestionnaireResponse } from 'mentora-firebase';
import { callBackend } from './backend.js';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
} from './types.js';

/**
 * Get a questionnaire response by ID
 */
export async function getQuestionnaireResponse(
	config: MentoraAPIConfig,
	responseId: string
): Promise<APIResult<QuestionnaireResponse>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, QuestionnaireResponses.docPath(responseId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Questionnaire response not found');
		}

		return QuestionnaireResponses.schema.parse(snapshot.data());
	});
}

/**
 * List questionnaire responses for a specific questionnaire (via backend)
 */
export async function listQuestionnaireResponses(
	config: MentoraAPIConfig,
	questionnaireId: string,
	options?: QueryOptions
): Promise<APIResult<QuestionnaireResponse[]>> {
	const params = new URLSearchParams({ questionnaireId });
	if (options?.limit) {
		params.set('limit', options.limit.toString());
	}

	const result = await callBackend<unknown[]>(config, `/questionnaire-responses?${params}`);
	if (!result.success) {
		return result;
	}

	return {
		success: true,
		data: result.data.map((r: unknown) => QuestionnaireResponses.schema.parse(r))
	};
}

/**
 * List user's own questionnaire responses
 */
export async function listMyQuestionnaireResponses(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<QuestionnaireResponse[]>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const collectionRef = collection(config.db, QuestionnaireResponses.collectionPath());

		let q = query(collectionRef, where('userId', '==', currentUser.uid));

		if (options?.limit) {
			// Import limit dynamically to avoid circular deps
			const { limit: limitFn } = await import('firebase/firestore');
			q = query(q, limitFn(options.limit));
		}

		const snapshot = await getDocs(q);
		return snapshot.docs.map((doc) => QuestionnaireResponses.schema.parse(doc.data()));
	});
}

/**
 * Get user's response to a specific questionnaire
 */
export async function getMyQuestionnaireResponse(
	config: MentoraAPIConfig,
	questionnaireId: string
): Promise<APIResult<QuestionnaireResponse | null>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const collectionRef = collection(config.db, QuestionnaireResponses.collectionPath());

		const q = query(
			collectionRef,
			where('userId', '==', currentUser.uid),
			where('questionnaireId', '==', questionnaireId)
		);

		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			return null;
		}

		// Return the most recent response if multiple exist
		const responses = snapshot.docs
			.map((doc) => QuestionnaireResponses.schema.parse(doc.data()))
			.sort((a, b) => b.submittedAt - a.submittedAt);

		return responses[0];
	});
}

/**
 * Submit a questionnaire response
 */
export async function submitQuestionnaireResponse(
	config: MentoraAPIConfig,
	questionnaireId: string,
	responses: QuestionnaireResponse['responses'],
	courseId?: string | null
): Promise<APIResult<string>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const now = Date.now();
		const docRef = doc(collection(config.db, QuestionnaireResponses.collectionPath()));

		const responseData: QuestionnaireResponse = {
			questionnaireId,
			userId: currentUser.uid,
			courseId: courseId ?? null,
			responses,
			submittedAt: now
		};

		// Validate against schema before sending
		QuestionnaireResponses.schema.parse(responseData);

		await setDoc(docRef, responseData);

		return docRef.id;
	});
}

/**
 * Update a questionnaire response (for resubmission)
 */
export async function updateQuestionnaireResponse(
	config: MentoraAPIConfig,
	responseId: string,
	responses: QuestionnaireResponse['responses']
): Promise<APIResult<QuestionnaireResponse>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, QuestionnaireResponses.docPath(responseId));

		await updateDoc(docRef, {
			responses,
			submittedAt: Date.now()
		});

		// Return updated response
		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) {
			throw new Error('Questionnaire response not found');
		}

		return QuestionnaireResponses.schema.parse(snapshot.data());
	});
}

/**
 * Delete a questionnaire response
 */
export async function deleteQuestionnaireResponse(
	config: MentoraAPIConfig,
	responseId: string
): Promise<APIResult<void>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, QuestionnaireResponses.docPath(responseId));
		await deleteDoc(docRef);
	});
}
