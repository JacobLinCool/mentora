import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';

async function loadModules() {
	vi.resetModules();

	const doc = vi.fn((_db: unknown, ...segments: string[]) => ({
		kind: 'doc',
		path: segments.join('/'),
		id: 'mock-doc-id'
	}));
	const getDoc = vi.fn();
	const setDoc = vi.fn();
	const updateDoc = vi.fn();
	const deleteDoc = vi.fn();
	const collection = vi.fn((_db: unknown, ...segments: string[]) => ({
		kind: 'collection',
		path: segments.join('/')
	}));

	vi.doMock('firebase/firestore', () => ({
		doc,
		getDoc,
		setDoc,
		updateDoc,
		deleteDoc,
		collection
	}));

	const topics = await import('../src/lib/api/topics.js');
	return { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, topics };
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

const validTopic = {
	id: 'topic-1',
	courseId: 'course-1',
	title: 'Test Topic',
	description: 'A test topic',
	order: 1,
	createdBy: 'teacher-1',
	createdAt: Date.now() - 120000,
	updatedAt: Date.now() - 60000,
	contents: [],
	contentTypes: []
};

describe('Topics (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTopic', () => {
		it('returns error when not found', async () => {
			const { getDoc, topics } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await topics.getTopic(createConfig('user-1'), 'topic-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Topic not found');
		});

		it('returns parsed topic on success', async () => {
			const { getDoc, topics } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validTopic })
			});

			const result = await topics.getTopic(createConfig('user-1'), 'topic-1');
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.title).toBe('Test Topic');
		});
	});

	describe('createTopic', () => {
		it('creates with schema parse and setDoc', async () => {
			const { setDoc, topics } = await loadModules();
			setDoc.mockResolvedValueOnce(undefined);

			const result = await topics.createTopic(createConfig('teacher-1'), {
				courseId: 'course-1',
				title: 'New Topic',
				description: null,
				order: 1,
				contents: [],
				contentTypes: []
			});
			expect(result.success).toBe(true);
			if (result.success) expect(typeof result.data).toBe('string');
			expect(setDoc).toHaveBeenCalled();
		});
	});

	describe('updateTopic', () => {
		it('returns error when not found after update', async () => {
			const { getDoc, updateDoc, topics } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await topics.updateTopic(createConfig('user-1'), 'topic-1', {
				title: 'Updated'
			});
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Topic not found');
		});

		it('returns updated topic on success', async () => {
			const { getDoc, updateDoc, topics } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validTopic, title: 'Updated' })
			});

			const result = await topics.updateTopic(createConfig('user-1'), 'topic-1', {
				title: 'Updated'
			});
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.title).toBe('Updated');
		});
	});

	describe('deleteTopic', () => {
		it('calls deleteDoc', async () => {
			const { deleteDoc, topics } = await loadModules();
			deleteDoc.mockResolvedValueOnce(undefined);

			const result = await topics.deleteTopic(createConfig('user-1'), 'topic-1');
			expect(result.success).toBe(true);
			expect(deleteDoc).toHaveBeenCalled();
		});
	});
});
