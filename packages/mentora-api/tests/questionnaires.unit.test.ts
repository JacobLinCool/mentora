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

	const questionnaires = await import('../src/lib/api/questionnaires.js');
	return { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, questionnaires };
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

const validQuestionnaire = {
	id: 'q-1-id',
	courseId: 'course-1',
	topicId: null,
	title: 'Test Questionnaire',
	questions: [
		{ question: { type: 'short_answer' as const, questionText: 'How are you?' }, required: true }
	],
	startAt: Date.now() - 60000,
	dueAt: null,
	allowLate: true,
	allowResubmit: true,
	createdBy: 'teacher-1',
	createdAt: Date.now() - 120000,
	updatedAt: Date.now() - 60000
};

describe('Questionnaires (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getQuestionnaire', () => {
		it('returns error when not found', async () => {
			const { getDoc, questionnaires } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await questionnaires.getQuestionnaire(createConfig('user-1'), 'q-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Questionnaire not found');
		});

		it('returns parsed questionnaire on success', async () => {
			const { getDoc, questionnaires } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validQuestionnaire })
			});

			const result = await questionnaires.getQuestionnaire(createConfig('user-1'), 'q-1');
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.title).toBe('Test Questionnaire');
		});
	});

	describe('createQuestionnaire', () => {
		it('creates with schema parse and setDoc', async () => {
			const { setDoc, questionnaires } = await loadModules();
			setDoc.mockResolvedValueOnce(undefined);

			const result = await questionnaires.createQuestionnaire(createConfig('teacher-1'), {
				courseId: 'course-1',
				topicId: null,
				title: 'New Questionnaire',
				questions: [
					{ question: { type: 'short_answer' as const, questionText: 'Why?' }, required: true }
				],
				startAt: Date.now(),
				dueAt: null,
				allowLate: true,
				allowResubmit: true
			});
			expect(result.success).toBe(true);
			if (result.success) expect(typeof result.data).toBe('string');
			expect(setDoc).toHaveBeenCalled();
		});
	});

	describe('updateQuestionnaire', () => {
		it('returns error when not found after update', async () => {
			const { getDoc, updateDoc, questionnaires } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await questionnaires.updateQuestionnaire(createConfig('user-1'), 'q-1', {
				title: 'Updated'
			});
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Questionnaire not found');
		});

		it('returns updated questionnaire on success', async () => {
			const { getDoc, updateDoc, questionnaires } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validQuestionnaire, title: 'Updated' })
			});

			const result = await questionnaires.updateQuestionnaire(createConfig('user-1'), 'q-1', {
				title: 'Updated'
			});
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.title).toBe('Updated');
		});
	});

	describe('deleteQuestionnaire', () => {
		it('calls deleteDoc', async () => {
			const { deleteDoc, questionnaires } = await loadModules();
			deleteDoc.mockResolvedValueOnce(undefined);

			const result = await questionnaires.deleteQuestionnaire(createConfig('user-1'), 'q-1');
			expect(result.success).toBe(true);
			expect(deleteDoc).toHaveBeenCalled();
		});
	});
});
