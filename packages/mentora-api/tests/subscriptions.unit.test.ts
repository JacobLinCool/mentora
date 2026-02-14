import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';

type FirestoreModuleMocks = {
	onSnapshot: ReturnType<typeof vi.fn>;
};

async function loadSubscriptionModules(): Promise<
	FirestoreModuleMocks & {
		users: typeof import('../src/lib/api/users.js');
		courses: typeof import('../src/lib/api/courses.js');
		conversations: typeof import('../src/lib/api/conversations.js');
	}
> {
	vi.resetModules();

	const onSnapshot = vi.fn();
	vi.doMock('firebase/firestore', () => ({
		doc: vi.fn((_db: unknown, ...segments: string[]) => ({
			kind: 'doc',
			path: segments.join('/')
		})),
		collection: vi.fn((_db: unknown, ...segments: string[]) => ({
			kind: 'collection',
			path: segments.join('/')
		})),
		query: vi.fn((target: unknown, ...constraints: unknown[]) => ({
			kind: 'query',
			target,
			constraints
		})),
		where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
		orderBy: vi.fn((field: string, direction = 'asc') => ({ field, direction })),
		limit: vi.fn((value: number) => ({ limit: value })),
		onSnapshot
	}));

	const [users, courses, conversations] = await Promise.all([
		import('../src/lib/api/users.js'),
		import('../src/lib/api/courses.js'),
		import('../src/lib/api/conversations.js')
	]);

	return { onSnapshot, users, courses, conversations };
}

type ReactiveStateMock<T> = {
	set: ReturnType<typeof vi.fn>;
	setLoading: ReturnType<typeof vi.fn>;
	setError: ReturnType<typeof vi.fn>;
	attachUnsubscribe: ReturnType<typeof vi.fn>;
	_: T | null;
};

function createStateMock<T>(): ReactiveStateMock<T> {
	return {
		set: vi.fn(),
		setLoading: vi.fn(),
		setError: vi.fn(),
		attachUnsubscribe: vi.fn(),
		_: null
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

describe('Subscription APIs (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('users.subscribeToMyProfile: handles unauthenticated, success, parse error, and snapshot error', async () => {
		const { onSnapshot, users } = await loadSubscriptionModules();

		const unauthState = createStateMock();
		users.subscribeToMyProfile(createConfig(null), unauthState as never);
		expect(unauthState.setError).toHaveBeenCalledWith('Not authenticated');

		const successState = createStateMock();
		const unsubscribe = vi.fn();
		onSnapshot.mockImplementationOnce((_ref, onValue) => {
			onValue({
				exists: () => true,
				data: () => ({
					uid: 'user-1',
					activeMode: 'student',
					displayName: 'Student One',
					email: 'student1@test.local',
					photoURL: null,
					createdAt: Date.now(),
					updatedAt: Date.now()
				})
			});
			return unsubscribe;
		});
		users.subscribeToMyProfile(createConfig('user-1'), successState as never);
		expect(successState.setLoading).toHaveBeenCalledWith(true);
		expect(successState.set).toHaveBeenCalledOnce();
		expect(successState.setError).toHaveBeenCalledWith(null);
		expect(successState.setLoading).toHaveBeenLastCalledWith(false);
		expect(successState.attachUnsubscribe).toHaveBeenCalledWith(unsubscribe);

		const parseErrorState = createStateMock();
		onSnapshot.mockImplementationOnce((_ref, onValue) => {
			onValue({
				exists: () => true,
				data: () => ({ uid: 'user-1' })
			});
			return vi.fn();
		});
		users.subscribeToMyProfile(createConfig('user-1'), parseErrorState as never);
		expect(parseErrorState.setError).toHaveBeenCalledWith(expect.any(String));
		expect(parseErrorState.setLoading).toHaveBeenLastCalledWith(false);

		const snapshotErrorState = createStateMock();
		onSnapshot.mockImplementationOnce((_ref, _onValue, onError) => {
			onError(new Error('profile snapshot error'));
			return vi.fn();
		});
		users.subscribeToMyProfile(createConfig('user-1'), snapshotErrorState as never);
		expect(snapshotErrorState.setError).toHaveBeenCalledWith('profile snapshot error');
		expect(snapshotErrorState.setLoading).toHaveBeenLastCalledWith(false);

		const missingState = createStateMock();
		onSnapshot.mockImplementationOnce((_ref, onValue) => {
			onValue({
				exists: () => false,
				data: () => ({})
			});
			return vi.fn();
		});
		users.subscribeToMyProfile(createConfig('user-1'), missingState as never);
		expect(missingState.setError).toHaveBeenCalledWith('Profile not found');
		expect(missingState.setLoading).toHaveBeenLastCalledWith(false);
	});

	it('courses.subscribeToMyCourses: handles unauthenticated, success, parse error, and snapshot error', async () => {
		const { onSnapshot, courses } = await loadSubscriptionModules();

		const unauthState = createStateMock();
		courses.subscribeToMyCourses(createConfig(null), unauthState as never);
		expect(unauthState.setError).toHaveBeenCalledWith('Not authenticated');
		expect(unauthState.setLoading).toHaveBeenCalledWith(false);

		const successState = createStateMock();
		const unsubscribe = vi.fn();
		onSnapshot.mockImplementationOnce((_query, onValue) => {
			onValue({
				docs: [
					{
						id: 'course-1',
						data: () => ({
							title: 'Course One',
							code: 'COURSE1',
							ownerId: 'teacher-1',
							visibility: 'private',
							passwordHash: null,
							theme: null,
							description: null,
							thumbnail: null,
							isDemo: false,
							demoPolicy: null,
							announcements: [],
							createdAt: Date.now(),
							updatedAt: Date.now()
						})
					}
				]
			});
			return unsubscribe;
		});

		courses.subscribeToMyCourses(createConfig('teacher-1'), successState as never, {
			limit: 5,
			where: [{ field: 'visibility', op: '==', value: 'private' }]
		});
		expect(successState.setLoading).toHaveBeenCalledWith(true);
		expect(successState.set).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ id: 'course-1' })])
		);
		expect(successState.setError).toHaveBeenCalledWith(null);
		expect(successState.attachUnsubscribe).toHaveBeenCalledWith(unsubscribe);

		const parseErrorState = createStateMock();
		onSnapshot.mockImplementationOnce((_query, onValue) => {
			onValue({
				docs: [{ id: 'course-2', data: () => ({ title: 'Invalid course' }) }]
			});
			return vi.fn();
		});
		courses.subscribeToMyCourses(createConfig('teacher-1'), parseErrorState as never);
		expect(parseErrorState.setError).toHaveBeenCalledWith(expect.any(String));
		expect(parseErrorState.setLoading).toHaveBeenLastCalledWith(false);

		const snapshotErrorState = createStateMock();
		onSnapshot.mockImplementationOnce((_query, _onValue, onError) => {
			onError(new Error('courses snapshot error'));
			return vi.fn();
		});
		courses.subscribeToMyCourses(createConfig('teacher-1'), snapshotErrorState as never);
		expect(snapshotErrorState.setError).toHaveBeenCalledWith('courses snapshot error');
		expect(snapshotErrorState.setLoading).toHaveBeenLastCalledWith(false);
	});

	it('conversations.subscribeToConversation: handles success, parse error, and snapshot error', async () => {
		const { onSnapshot, conversations } = await loadSubscriptionModules();

		const successState = createStateMock();
		const unsubscribe = vi.fn();
		onSnapshot.mockImplementationOnce((_docRef, onValue) => {
			onValue({
				id: 'conversation-1',
				exists: () => true,
				data: () => ({
					assignmentId: 'assignment-1',
					userId: 'user-1',
					state: 'awaiting_idea',
					lastActionAt: Date.now(),
					createdAt: Date.now(),
					updatedAt: Date.now(),
					turns: [],
					tokenUsage: null
				})
			});
			return unsubscribe;
		});
		conversations.subscribeToConversation(
			createConfig('user-1'),
			'conversation-1',
			successState as never
		);
		expect(successState.setLoading).toHaveBeenCalledWith(true);
		expect(successState.set).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'conversation-1' })
		);
		expect(successState.setError).toHaveBeenCalledWith(null);
		expect(successState.attachUnsubscribe).toHaveBeenCalledWith(unsubscribe);
		expect(successState.setLoading).toHaveBeenLastCalledWith(false);

		const parseErrorState = createStateMock();
		onSnapshot.mockImplementationOnce((_docRef, onValue) => {
			onValue({
				id: 'conversation-2',
				exists: () => true,
				data: () => ({ assignmentId: 'assignment-1' })
			});
			return vi.fn();
		});
		conversations.subscribeToConversation(
			createConfig('user-1'),
			'conversation-2',
			parseErrorState as never
		);
		expect(parseErrorState.setError).toHaveBeenCalledWith(expect.any(String));
		expect(parseErrorState.setLoading).toHaveBeenLastCalledWith(false);

		const missingState = createStateMock();
		onSnapshot.mockImplementationOnce((_docRef, onValue) => {
			onValue({
				id: 'conversation-3',
				exists: () => false,
				data: () => ({})
			});
			return vi.fn();
		});
		conversations.subscribeToConversation(
			createConfig('user-1'),
			'conversation-3',
			missingState as never
		);
		expect(missingState.setError).toHaveBeenCalledWith('Conversation not found');
		expect(missingState.setLoading).toHaveBeenLastCalledWith(false);

		const snapshotErrorState = createStateMock();
		onSnapshot.mockImplementationOnce((_docRef, _onValue, onError) => {
			onError(new Error('conversation snapshot error'));
			return vi.fn();
		});
		conversations.subscribeToConversation(
			createConfig('user-1'),
			'conversation-4',
			snapshotErrorState as never
		);
		expect(snapshotErrorState.setError).toHaveBeenCalledWith('conversation snapshot error');
		expect(snapshotErrorState.setLoading).toHaveBeenLastCalledWith(false);
	});
});
