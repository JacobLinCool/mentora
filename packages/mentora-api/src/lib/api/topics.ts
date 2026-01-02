/**
 * Topic operations
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
import { Topics, type Topic } from 'mentora-firebase';
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
 * List topics for a course
 */
export async function listCourseTopics(
	config: MentoraAPIConfig,
	courseId: string,
	options?: QueryOptions
): Promise<APIResult<Topic[]>> {
	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [
			where('courseId', '==', courseId),
			orderBy('order', 'asc')
		];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(collection(config.db, Topics.collectionPath()), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => Topics.schema.parse(doc.data()));
	});
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
		const { deleteDoc } = await import('firebase/firestore');
		const docRef = doc(config.db, Topics.docPath(topicId));
		await deleteDoc(docRef);
	});
}
