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

	const assignments = await import('../src/lib/api/assignments.js');
	return { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, assignments };
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

const validAssignment = {
	id: 'assign-1',
	courseId: 'course-1',
	topicId: null,
	title: 'Test Assignment',
	question: null,
	prompt: 'Test prompt content here',
	mode: 'instant' as const,
	startAt: Date.now() - 60000,
	dueAt: null,
	allowLate: false,
	allowResubmit: false,
	createdBy: 'teacher-1',
	createdAt: Date.now() - 120000,
	updatedAt: Date.now() - 60000
};

describe('Assignments (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getAssignment', () => {
		it('returns error when not found', async () => {
			const { getDoc, assignments } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await assignments.getAssignment(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Assignment not found');
		});

		it('returns parsed assignment on success', async () => {
			const { getDoc, assignments } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validAssignment })
			});

			const result = await assignments.getAssignment(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe('Test Assignment');
			}
		});
	});

	describe('createAssignment', () => {
		it('creates with schema parse and setDoc', async () => {
			const { setDoc, assignments } = await loadModules();
			setDoc.mockResolvedValueOnce(undefined);

			const result = await assignments.createAssignment(createConfig('teacher-1'), {
				courseId: 'course-1',
				topicId: null,
				title: 'New Assignment',
				question: null,
				prompt: 'A prompt for the new assignment',
				mode: 'instant',
				startAt: Date.now(),
				dueAt: null,
				allowLate: true,
				allowResubmit: false
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(typeof result.data).toBe('string');
			}
			expect(setDoc).toHaveBeenCalled();
		});
	});

	describe('updateAssignment', () => {
		it('returns error when not found after update', async () => {
			const { getDoc, updateDoc, assignments } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await assignments.updateAssignment(createConfig('user-1'), 'assign-1', {
				title: 'Updated'
			});
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Assignment not found');
		});

		it('returns updated assignment on success', async () => {
			const { getDoc, updateDoc, assignments } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validAssignment, title: 'Updated' })
			});

			const result = await assignments.updateAssignment(createConfig('user-1'), 'assign-1', {
				title: 'Updated'
			});
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.title).toBe('Updated');
		});
	});

	describe('deleteAssignment', () => {
		it('calls deleteDoc', async () => {
			const { deleteDoc, assignments } = await loadModules();
			deleteDoc.mockResolvedValueOnce(undefined);

			const result = await assignments.deleteAssignment(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(true);
			expect(deleteDoc).toHaveBeenCalled();
		});
	});
});
