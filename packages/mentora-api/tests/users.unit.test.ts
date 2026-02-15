import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';

async function loadModules() {
	vi.resetModules();

	const doc = vi.fn((_db: unknown, ...segments: string[]) => ({
		kind: 'doc',
		path: segments.join('/')
	}));
	const getDoc = vi.fn();
	const setDoc = vi.fn();
	const onSnapshot = vi.fn();

	vi.doMock('firebase/firestore', () => ({
		doc,
		getDoc,
		setDoc,
		onSnapshot
	}));

	const users = await import('../src/lib/api/users.js');
	return { doc, getDoc, setDoc, onSnapshot, users };
}

function createConfig(
	userId: string | null,
	opts?: { displayName?: string | null; email?: string | null; photoURL?: string | null }
): MentoraAPIConfig {
	return {
		auth: {} as MentoraAPIConfig['auth'],
		db: {} as MentoraAPIConfig['db'],
		backendBaseUrl: 'http://api.test',
		environment: { browser: false },
		getCurrentUser: () =>
			userId
				? ({
						uid: userId,
						displayName: opts?.displayName ?? 'Default Name',
						email: opts?.email ?? 'user@test.local',
						photoURL: opts?.photoURL ?? 'https://example.com/photo.jpg',
						getIdToken: vi.fn().mockResolvedValue('token')
					} as unknown as ReturnType<MentoraAPIConfig['getCurrentUser']>)
				: null
	};
}

const validProfile = {
	uid: 'user-1',
	activeMode: 'student' as const,
	displayName: 'Test User',
	email: 'test@test.local',
	photoURL: null,
	createdAt: Date.now() - 60000,
	updatedAt: Date.now()
};

describe('Users (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getMyProfile', () => {
		it('returns error when not found', async () => {
			const { getDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await users.getMyProfile(createConfig('user-1'));
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Profile not found');
		});

		it('returns parsed profile on success', async () => {
			const { getDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validProfile })
			});

			const result = await users.getMyProfile(createConfig('user-1'));
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.uid).toBe('user-1');
				expect(result.data.displayName).toBe('Test User');
			}
		});
	});

	describe('getUserProfile', () => {
		it('returns error when not found', async () => {
			const { getDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await users.getUserProfile(createConfig('user-1'), 'other-user');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Profile not found');
		});

		it('returns parsed profile on success', async () => {
			const { getDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validProfile, uid: 'other-user' })
			});

			const result = await users.getUserProfile(createConfig('user-1'), 'other-user');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.uid).toBe('other-user');
			}
		});
	});

	describe('updateMyProfile', () => {
		it('creates new profile with displayName from profile arg', async () => {
			const { getDoc, setDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });
			setDoc.mockResolvedValueOnce(undefined);

			const result = await users.updateMyProfile(createConfig('user-1'), {
				displayName: 'Custom Name',
				activeMode: 'mentor'
			});
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					uid: 'user-1',
					displayName: 'Custom Name',
					activeMode: 'mentor'
				})
			);
		});

		it('creates new profile with fallback to currentUser.displayName', async () => {
			const { getDoc, setDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });
			setDoc.mockResolvedValueOnce(undefined);

			const result = await users.updateMyProfile(
				createConfig('user-1', { displayName: 'Auth Name' }),
				{ activeMode: 'student' }
			);
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ displayName: 'Auth Name' })
			);
		});

		it('creates new profile with photoURL from currentUser when undefined in profile', async () => {
			const { getDoc, setDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });
			setDoc.mockResolvedValueOnce(undefined);

			const result = await users.updateMyProfile(
				createConfig('user-1', { photoURL: 'https://example.com/me.jpg' }),
				{ activeMode: 'student' }
			);
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ photoURL: 'https://example.com/me.jpg' })
			);
		});

		it('creates new profile with null photoURL when explicitly set to null', async () => {
			const { getDoc, setDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });
			setDoc.mockResolvedValueOnce(undefined);

			const result = await users.updateMyProfile(
				createConfig('user-1', { photoURL: 'https://example.com/me.jpg' }),
				{ photoURL: null }
			);
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ photoURL: null })
			);
		});

		it('updates existing profile with merge: true', async () => {
			const { getDoc, setDoc, users } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ ...validProfile }) });
			setDoc.mockResolvedValueOnce(undefined);

			const result = await users.updateMyProfile(createConfig('user-1'), {
				displayName: 'Updated Name'
			});
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ displayName: 'Updated Name' }),
				{ merge: true }
			);
		});
	});
});
