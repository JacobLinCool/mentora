/**
 * Topic operations
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
	where
} from 'firebase/firestore';
import { Topics, type Topic } from 'mentora-firebase';
import {
	failure,
	success,
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
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	try {
		const token = await currentUser.getIdToken();
		const params = new URLSearchParams({ courseId });
		if (options?.limit) {
			params.set('limit', options.limit.toString());
		}

		const response = await fetch(`${config.backendBaseUrl}/api/topics?${params}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.text();
			return failure(error || `HTTP ${response.status}`);
		}

		const data = await response.json();
		return success(data.map((t: unknown) => Topics.schema.parse(t)));
	} catch (error) {
		return failure(error instanceof Error ? error.message : 'Network error');
	}
}

/**
 * Create a new topic
 *
 * Automatically calculates order if not provided.
 */
export async function createTopic(
	config: MentoraAPIConfig,
	topic: Omit<Topic, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> & { order?: number | null }
): Promise<APIResult<string>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const now = Date.now();

		// Calculate order if not provided
		let topicOrder = topic.order;
		if (topicOrder === undefined || topicOrder === null) {
			const existingTopicsQuery = query(
				collection(config.db, Topics.collectionPath()),
				where('courseId', '==', topic.courseId),
				orderBy('order', 'desc'),
				limit(1)
			);
			const existingTopics = await getDocs(existingTopicsQuery);

			if (existingTopics.empty) {
				topicOrder = 1;
			} else {
				const lastTopic = existingTopics.docs[0].data();
				topicOrder = ((lastTopic.order as number) || 0) + 1;
			}
		}

		const docRef = doc(collection(config.db, Topics.collectionPath()));
		const topicData: Topic = {
			...topic,
			order: topicOrder,
			id: docRef.id,
			createdBy: currentUser.uid,
			createdAt: now,
			updatedAt: now
		};

		// Validate schema
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
): Promise<APIResult<void>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const docRef = doc(config.db, Topics.docPath(topicId));
		await updateDoc(docRef, {
			...updates,
			updatedAt: Date.now()
		});
	});
}

/**
 * Delete a topic
 */
export async function deleteTopic(
	config: MentoraAPIConfig,
	topicId: string
): Promise<APIResult<void>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const docRef = doc(config.db, Topics.docPath(topicId));
		await deleteDoc(docRef);
	});
}
