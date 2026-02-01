/**
 * Questionnaire response operations
 */
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	limit,
	query,
	setDoc,
	updateDoc,
	where
} from 'firebase/firestore';
import { QuestionnaireResponses, type QuestionnaireResponse } from 'mentora-firebase';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
} from './types.js';

/**
 * Get a questionnaire response for a specific user
 * Used by instructors to view student responses
 */
export async function getQuestionnaireResponse(
	config: MentoraAPIConfig,
	questionnaireId: string,
	userId: string
): Promise<APIResult<QuestionnaireResponse>> {
	return tryCatch(async () => {
		const docId = `${questionnaireId}_${userId}`;
		const docRef = doc(config.db, QuestionnaireResponses.collectionPath(), docId);
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Questionnaire response not found');
		}

		return QuestionnaireResponses.schema.parse(snapshot.data());
	});
}

/**
 * List questionnaire responses for a specific questionnaire
 * Requires instructor/TA access to the course
 */
export async function listQuestionnaireResponses(
	config: MentoraAPIConfig,
	questionnaireId: string,
	options?: QueryOptions
): Promise<APIResult<QuestionnaireResponse[]>> {
	return tryCatch(async () => {
		const collectionRef = collection(config.db, QuestionnaireResponses.collectionPath());

		let q = query(collectionRef, where('questionnaireId', '==', questionnaireId));

		if (options?.limit) {
			q = query(q, limit(options.limit));
		}

		const snapshot = await getDocs(q);
		return snapshot.docs.map((doc) => QuestionnaireResponses.schema.parse(doc.data()));
	});
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
			q = query(q, limit(options.limit));
		}

		const snapshot = await getDocs(q);
		return snapshot.docs.map((doc) => QuestionnaireResponses.schema.parse(doc.data()));
	});
}

/**
 * Get user's response to a specific questionnaire
 * Uses fixed document ID (similar to getMySubmission)
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
		// Use fixed document ID: questionnaireId_userId
		const docId = `${questionnaireId}_${currentUser.uid}`;
		const docRef = doc(config.db, QuestionnaireResponses.collectionPath(), docId);
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			return null;
		}

		return QuestionnaireResponses.schema.parse(snapshot.data());
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
		const docId = `${questionnaireId}_${currentUser.uid}`;
		const docRef = doc(config.db, QuestionnaireResponses.collectionPath(), docId);

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
 * Update current user's questionnaire response (for resubmission)
 */
export async function updateMyQuestionnaireResponse(
	config: MentoraAPIConfig,
	questionnaireId: string,
	responses: QuestionnaireResponse['responses']
): Promise<APIResult<QuestionnaireResponse>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const docId = `${questionnaireId}_${currentUser.uid}`;
		const docRef = doc(config.db, QuestionnaireResponses.collectionPath(), docId);

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
 * Delete a questionnaire response (instructor only)
 */
export async function deleteQuestionnaireResponse(
	config: MentoraAPIConfig,
	questionnaireId: string,
	userId: string
): Promise<APIResult<void>> {
	return tryCatch(async () => {
		const docId = `${questionnaireId}_${userId}`;
		const docRef = doc(config.db, QuestionnaireResponses.collectionPath(), docId);
		await deleteDoc(docRef);
	});
}
