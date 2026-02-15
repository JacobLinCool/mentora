import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	onSnapshot,
	orderBy,
	query,
	where,
	type QueryConstraint
} from 'firebase/firestore';
import { Announcements, type AnnouncementDoc } from 'mentora-firebase';
import { callBackend } from './backend.js';
import type { ReactiveState } from './state.svelte.js';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
} from './types.js';

export type Announcement = AnnouncementDoc & { id: string };

export async function listMyAnnouncements(
	config: MentoraAPIConfig,
	options?: QueryOptions
): Promise<APIResult<Announcement[]>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}
		if (options?.where) {
			for (const w of options.where) {
				constraints.push(where(w.field, w.op, w.value));
			}
		}

		const q = query(
			collection(config.db, Announcements.collectionPath(currentUser.uid)),
			...constraints
		);
		const snapshot = await getDocs(q);
		return snapshot.docs.map((announcementDoc) => ({
			id: announcementDoc.id,
			...Announcements.schema.parse(announcementDoc.data())
		}));
	});
}

export async function getMyAnnouncement(
	config: MentoraAPIConfig,
	announcementId: string
): Promise<APIResult<Announcement>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const announcementRef = doc(config.db, Announcements.docPath(currentUser.uid, announcementId));
		const snapshot = await getDoc(announcementRef);
		if (!snapshot.exists()) {
			throw new Error('Announcement not found');
		}
		return {
			id: snapshot.id,
			...Announcements.schema.parse(snapshot.data())
		};
	});
}

export async function markAnnouncementRead(
	config: MentoraAPIConfig,
	announcementId: string
): Promise<APIResult<{ updated: boolean }>> {
	return callBackend<{ updated: boolean }>(config, `/announcements/${announcementId}/read`, {
		method: 'POST'
	});
}

export async function markAllAnnouncementsRead(
	config: MentoraAPIConfig
): Promise<APIResult<{ updatedCount: number }>> {
	return callBackend<{ updatedCount: number }>(config, '/announcements/read-all', {
		method: 'POST'
	});
}

export function subscribeToMyAnnouncements(
	config: MentoraAPIConfig,
	state: ReactiveState<Announcement[]>,
	options?: QueryOptions
): void {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		state.setError('Not authenticated');
		state.setLoading(false);
		return;
	}

	state.setLoading(true);
	const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

	if (options?.limit) {
		constraints.push(limit(options.limit));
	}
	if (options?.where) {
		for (const w of options.where) {
			constraints.push(where(w.field, w.op, w.value));
		}
	}

	const q = query(
		collection(config.db, Announcements.collectionPath(currentUser.uid)),
		...constraints
	);

	const unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			try {
				const data = snapshot.docs.map((announcementDoc) => ({
					id: announcementDoc.id,
					...Announcements.schema.parse(announcementDoc.data())
				}));

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

export function subscribeToUnreadAnnouncementCount(
	config: MentoraAPIConfig,
	state: ReactiveState<number>
): void {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		state.setError('Not authenticated');
		state.setLoading(false);
		return;
	}

	state.setLoading(true);
	const q = query(
		collection(config.db, Announcements.collectionPath(currentUser.uid)),
		where('isRead', '==', false)
	);

	const unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			state.set(snapshot.size);
			state.setError(null);
			state.setLoading(false);
		},
		(error) => {
			state.setError(error.message);
			state.setLoading(false);
		}
	);

	state.attachUnsubscribe(unsubscribe);
}
