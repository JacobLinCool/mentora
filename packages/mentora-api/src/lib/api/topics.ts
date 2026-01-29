/**
 * Topic operations
 */
import { collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Topics, type Topic } from 'mentora-firebase';
import { callBackend } from './backend.js';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
} from './types.js';

/**
 * Get a topic by ID
 */
export async function getTopic(
	config: MentoraAPIConfig,
	topicId: string
): Promise<APIResult<Topic>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Topics.docPath(topicId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Topic not found');
		}

		return Topics.schema.parse(snapshot.data());
	});
}

/**
 * List topics for a course (via backend)
 */
export async function listCourseTopics(
	config: MentoraAPIConfig,
	courseId: string,
	options?: QueryOptions
): Promise<APIResult<Topic[]>> {
	const params = new URLSearchParams({ courseId });
	if (options?.limit) {
		params.set('limit', options.limit.toString());
	}

	const result = await callBackend<unknown[]>(config, `/topics?${params}`);
	if (!result.success) {
		return result;
	}

	return {
		success: true,
		data: result.data.map((t: unknown) => Topics.schema.parse(t))
	};
}

/**
 * Create a new topic
 */
export async function createTopic(
	config: MentoraAPIConfig,
	topic: Omit<Topic, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<APIResult<string>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const now = Date.now();
		const docRef = doc(collection(config.db, Topics.collectionPath()));
		const topicData: Topic = {
			...topic,
			id: docRef.id,
			createdBy: currentUser.uid,
			createdAt: now,
			updatedAt: now
		};

		// Validate against schema before sending
		Topics.schema.parse(topicData);

		await setDoc(docRef, topicData);

		return docRef.id;
	});
}

/**
 * Update a topic
 */
export async function updateTopic(
	config: MentoraAPIConfig,
	topicId: string,
	updates: Partial<Omit<Topic, 'id' | 'courseId' | 'createdBy' | 'createdAt'>>
): Promise<APIResult<Topic>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Topics.docPath(topicId));

		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});

		// Return updated topic
		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) {
			throw new Error('Topic not found');
		}

		return Topics.schema.parse(snapshot.data());
	});
}

/**
 * Delete a topic
 */
export async function deleteTopic(
	config: MentoraAPIConfig,
	topicId: string
): Promise<APIResult<void>> {
	return tryCatch(async () => {
		const docRef = doc(config.db, Topics.docPath(topicId));
		await deleteDoc(docRef);
	});
}
