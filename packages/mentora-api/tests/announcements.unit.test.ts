import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';

type FirestoreModuleMocks = {
	callBackend: ReturnType<typeof vi.fn>;
	doc: ReturnType<typeof vi.fn>;
	getDoc: ReturnType<typeof vi.fn>;
	getDocs: ReturnType<typeof vi.fn>;
	collection: ReturnType<typeof vi.fn>;
	query: ReturnType<typeof vi.fn>;
	where: ReturnType<typeof vi.fn>;
	orderBy: ReturnType<typeof vi.fn>;
	limit: ReturnType<typeof vi.fn>;
	onSnapshot: ReturnType<typeof vi.fn>;
};

const validAnnouncementDoc = {
	type: 'course_announcement' as const,
	payload: {
		courseId: 'course-1',
		courseTitle: 'Course 1',
		courseAnnouncementId: 'course-announcement-1',
		contentPreview: 'Preview'
	},
	actorId: 'teacher-1',
	isRead: false,
	readAt: null,
	createdAt: Date.now() - 60_000,
	updatedAt: Date.now()
};

async function loadModules(): Promise<
	FirestoreModuleMocks & {
		announcements: typeof import('../src/lib/api/announcements.js');
	}
> {
	vi.resetModules();

	const doc = vi.fn((_db: unknown, ...segments: string[]) => ({
		kind: 'doc',
		path: segments.join('/'),
		id: segments[segments.length - 1]
	}));
	const getDoc = vi.fn();
	const getDocs = vi.fn();
	const collection = vi.fn((_db: unknown, ...segments: string[]) => ({
		kind: 'collection',
		path: segments.join('/')
	}));
	const query = vi.fn((target: unknown, ...constraints: unknown[]) => ({
		kind: 'query',
		target,
		constraints
	}));
	const where = vi.fn((field: string, op: string, value: unknown) => ({ field, op, value }));
	const orderBy = vi.fn((field: string, direction = 'asc') => ({ field, direction }));
	const limit = vi.fn((value: number) => ({ limit: value }));
	const onSnapshot = vi.fn();
	const callBackend = vi.fn();

	vi.doMock('firebase/firestore', () => ({
		collection,
		doc,
		getDoc,
		getDocs,
		limit,
		onSnapshot,
		orderBy,
		query,
		where
	}));
	vi.doMock('../src/lib/api/backend.js', () => ({
		callBackend
	}));

	const announcements = await import('../src/lib/api/announcements.js');
	return {
		announcements,
		callBackend,
		doc,
		getDoc,
		getDocs,
		collection,
		query,
		where,
		orderBy,
		limit,
		onSnapshot
	};
}

function createConfig(userId: string | null): MentoraAPIConfig {
	return {
		auth: {} as MentoraAPIConfig['auth'],
		db: {} as MentoraAPIConfig['db'],
		backendBaseUrl: 'http://api.test',
		environment: { browser: false },
		getCurrentUser: () =>
			userId
				? ({
						uid: userId,
						getIdToken: vi.fn().mockResolvedValue('token')
					} as unknown as ReturnType<MentoraAPIConfig['getCurrentUser']>)
				: null
	};
}

function createStateMock<T>() {
	return {
		set: vi.fn<(value: T) => void>(),
		setError: vi.fn<(error: string | null) => void>(),
		setLoading: vi.fn<(loading: boolean) => void>(),
		attachUnsubscribe: vi.fn<(unsubscribe: () => void) => void>()
	};
}

describe('Announcements (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('listMyAnnouncements', () => {
		it('returns parsed announcements and applies query options', async () => {
			const { announcements, getDocs, limit, where, orderBy } = await loadModules();
			getDocs.mockResolvedValueOnce({
				docs: [{ id: 'announcement-1', data: () => ({ ...validAnnouncementDoc }) }]
			});

			const result = await announcements.listMyAnnouncements(createConfig('user-1'), {
				limit: 5,
				where: [{ field: 'isRead', op: '==', value: false }]
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(1);
				expect(result.data[0]?.id).toBe('announcement-1');
			}
			expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
			expect(limit).toHaveBeenCalledWith(5);
			expect(where).toHaveBeenCalledWith('isRead', '==', false);
		});

		it('works without optional constraints', async () => {
			const { announcements, getDocs, limit, where } = await loadModules();
			getDocs.mockResolvedValueOnce({ docs: [] });

			const result = await announcements.listMyAnnouncements(createConfig('user-1'));
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(0);
			}
			expect(limit).not.toHaveBeenCalled();
			expect(where).not.toHaveBeenCalled();
		});

		it('returns error when unauthenticated', async () => {
			const { announcements } = await loadModules();
			const result = await announcements.listMyAnnouncements(createConfig(null));
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Not authenticated');
			}
		});

		it('returns parse error for invalid data', async () => {
			const { announcements, getDocs } = await loadModules();
			getDocs.mockResolvedValueOnce({
				docs: [{ id: 'announcement-1', data: () => ({ type: 'invalid_type' }) }]
			});

			const result = await announcements.listMyAnnouncements(createConfig('user-1'));
			expect(result.success).toBe(false);
		});
	});

	describe('getMyAnnouncement', () => {
		it('returns parsed announcement when found', async () => {
			const { announcements, getDoc } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				id: 'announcement-1',
				data: () => ({ ...validAnnouncementDoc })
			});

			const result = await announcements.getMyAnnouncement(
				createConfig('user-1'),
				'announcement-1'
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('announcement-1');
				expect(result.data.type).toBe('course_announcement');
			}
		});

		it('returns error when announcement does not exist', async () => {
			const { announcements, getDoc } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await announcements.getMyAnnouncement(
				createConfig('user-1'),
				'announcement-1'
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Announcement not found');
			}
		});

		it('returns error when unauthenticated', async () => {
			const { announcements } = await loadModules();
			const result = await announcements.getMyAnnouncement(createConfig(null), 'announcement-1');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Not authenticated');
			}
		});
	});

	describe('mark read operations', () => {
		it('markAnnouncementRead forwards to backend endpoint', async () => {
			const { announcements, callBackend } = await loadModules();
			callBackend.mockResolvedValueOnce({ success: true, data: { updated: true } });

			const result = await announcements.markAnnouncementRead(
				createConfig('user-1'),
				'announcement-1'
			);
			expect(result.success).toBe(true);
			expect(callBackend).toHaveBeenCalledWith(
				expect.anything(),
				'/announcements/announcement-1/read',
				{ method: 'POST' }
			);
		});

		it('markAllAnnouncementsRead forwards to backend endpoint', async () => {
			const { announcements, callBackend } = await loadModules();
			callBackend.mockResolvedValueOnce({ success: true, data: { updatedCount: 2 } });

			const result = await announcements.markAllAnnouncementsRead(createConfig('user-1'));
			expect(result.success).toBe(true);
			expect(callBackend).toHaveBeenCalledWith(expect.anything(), '/announcements/read-all', {
				method: 'POST'
			});
		});
	});

	describe('subscribeToMyAnnouncements', () => {
		it('sets unauthenticated state and exits', async () => {
			const { announcements, onSnapshot } = await loadModules();
			const state = createStateMock<unknown[]>();

			announcements.subscribeToMyAnnouncements(createConfig(null), state as never);
			expect(state.setError).toHaveBeenCalledWith('Not authenticated');
			expect(state.setLoading).toHaveBeenCalledWith(false);
			expect(onSnapshot).not.toHaveBeenCalled();
		});

		it('subscribes and updates state on snapshot success', async () => {
			const { announcements, onSnapshot } = await loadModules();
			const state = createStateMock<unknown[]>();
			const unsubscribe = vi.fn();
			onSnapshot.mockImplementationOnce((_query, onValue) => {
				onValue({
					docs: [{ id: 'announcement-1', data: () => ({ ...validAnnouncementDoc }) }]
				});
				return unsubscribe;
			});

			announcements.subscribeToMyAnnouncements(createConfig('user-1'), state as never, {
				limit: 5,
				where: [{ field: 'isRead', op: '==', value: false }]
			});
			expect(state.setLoading).toHaveBeenCalledWith(true);
			expect(state.set).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ id: 'announcement-1' })])
			);
			expect(state.setError).toHaveBeenCalledWith(null);
			expect(state.attachUnsubscribe).toHaveBeenCalledWith(unsubscribe);
			expect(state.setLoading).toHaveBeenLastCalledWith(false);
		});

		it('handles parse error with Error instance', async () => {
			const { announcements, onSnapshot } = await loadModules();
			const state = createStateMock<unknown[]>();
			onSnapshot.mockImplementationOnce((_query, onValue) => {
				onValue({ docs: [{ id: 'announcement-1', data: () => ({ type: 'invalid' }) }] });
				return vi.fn();
			});

			announcements.subscribeToMyAnnouncements(createConfig('user-1'), state as never);
			expect(state.setError).toHaveBeenCalledWith(expect.any(String));
			expect(state.setLoading).toHaveBeenLastCalledWith(false);
		});

		it('handles parse error with non-Error throw', async () => {
			const { announcements, onSnapshot } = await loadModules();
			const state = createStateMock<unknown[]>();
			onSnapshot.mockImplementationOnce((_query, onValue) => {
				onValue({
					docs: [
						{
							id: 'announcement-1',
							data: () => {
								throw 'bad';
							}
						}
					]
				});
				return vi.fn();
			});

			announcements.subscribeToMyAnnouncements(createConfig('user-1'), state as never);
			expect(state.setError).toHaveBeenCalledWith('Parse error');
			expect(state.setLoading).toHaveBeenLastCalledWith(false);
		});

		it('handles snapshot error callback', async () => {
			const { announcements, onSnapshot } = await loadModules();
			const state = createStateMock<unknown[]>();
			onSnapshot.mockImplementationOnce((_query, _onValue, onError) => {
				onError(new Error('announcement snapshot error'));
				return vi.fn();
			});

			announcements.subscribeToMyAnnouncements(createConfig('user-1'), state as never);
			expect(state.setError).toHaveBeenCalledWith('announcement snapshot error');
			expect(state.setLoading).toHaveBeenLastCalledWith(false);
		});
	});

	describe('subscribeToUnreadAnnouncementCount', () => {
		it('sets unauthenticated state and exits', async () => {
			const { announcements, onSnapshot } = await loadModules();
			const state = createStateMock<number>();

			announcements.subscribeToUnreadAnnouncementCount(createConfig(null), state as never);
			expect(state.setError).toHaveBeenCalledWith('Not authenticated');
			expect(state.setLoading).toHaveBeenCalledWith(false);
			expect(onSnapshot).not.toHaveBeenCalled();
		});

		it('subscribes and updates unread count', async () => {
			const { announcements, onSnapshot } = await loadModules();
			const state = createStateMock<number>();
			const unsubscribe = vi.fn();
			onSnapshot.mockImplementationOnce((_query, onValue) => {
				onValue({ size: 4 });
				return unsubscribe;
			});

			announcements.subscribeToUnreadAnnouncementCount(createConfig('user-1'), state as never);
			expect(state.setLoading).toHaveBeenCalledWith(true);
			expect(state.set).toHaveBeenCalledWith(4);
			expect(state.setError).toHaveBeenCalledWith(null);
			expect(state.attachUnsubscribe).toHaveBeenCalledWith(unsubscribe);
			expect(state.setLoading).toHaveBeenLastCalledWith(false);
		});

		it('handles unread count snapshot error callback', async () => {
			const { announcements, onSnapshot } = await loadModules();
			const state = createStateMock<number>();
			onSnapshot.mockImplementationOnce((_query, _onValue, onError) => {
				onError(new Error('unread snapshot error'));
				return vi.fn();
			});

			announcements.subscribeToUnreadAnnouncementCount(createConfig('user-1'), state as never);
			expect(state.setError).toHaveBeenCalledWith('unread snapshot error');
			expect(state.setLoading).toHaveBeenLastCalledWith(false);
		});
	});
});
