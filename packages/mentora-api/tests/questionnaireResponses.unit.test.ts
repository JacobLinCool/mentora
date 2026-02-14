import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';

async function loadModules() {
	vi.resetModules();

	const doc = vi.fn((_db: unknown, ...segments: string[]) => ({
		kind: 'doc',
		path: segments.join('/'),
		id: segments[segments.length - 1]
	}));
	const getDoc = vi.fn();
	const getDocs = vi.fn();
	const setDoc = vi.fn();
	const updateDoc = vi.fn();
	const deleteDoc = vi.fn();
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
	const limit = vi.fn((value: number) => ({ limit: value }));

	vi.doMock('firebase/firestore', () => ({
		doc,
		getDoc,
		getDocs,
		setDoc,
		updateDoc,
		deleteDoc,
		collection,
		query,
		where,
		limit
	}));

	const questionnaireResponses = await import('../src/lib/api/questionnaireResponses.js');
	return {
		doc,
		getDoc,
		getDocs,
		setDoc,
		updateDoc,
		deleteDoc,
		collection,
		query,
		where,
		limit,
		questionnaireResponses
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

const validResponse = {
	questionnaireId: 'q-1',
	userId: 'user-1',
	courseId: 'course-1',
	responses: [{ questionIndex: 0, answer: { type: 'short_answer' as const, response: 'Hello' } }],
	submittedAt: Date.now()
};

const validQuestionnaire = {
	id: 'q-1-id',
	courseId: 'course-1',
	topicId: null,
	title: 'Test Questionnaire',
	questions: [
		{ question: { type: 'short_answer' as const, questionText: 'How?' }, required: true }
	],
	startAt: Date.now() - 60000,
	dueAt: null,
	allowLate: true,
	allowResubmit: true,
	createdBy: 'teacher-1',
	createdAt: Date.now() - 120000,
	updatedAt: Date.now() - 60000
};

describe('QuestionnaireResponses (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getQuestionnaireResponse', () => {
		it('returns error when not found', async () => {
			const { getDoc, questionnaireResponses } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await questionnaireResponses.getQuestionnaireResponse(
				createConfig('user-1'),
				'q-1',
				'user-1'
			);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Questionnaire response not found');
		});

		it('returns parsed response on success', async () => {
			const { getDoc, questionnaireResponses } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validResponse })
			});

			const result = await questionnaireResponses.getQuestionnaireResponse(
				createConfig('user-1'),
				'q-1',
				'user-1'
			);
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.questionnaireId).toBe('q-1');
		});
	});

	describe('listQuestionnaireResponses', () => {
		it('returns error when questionnaire not found', async () => {
			const { getDoc, questionnaireResponses } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await questionnaireResponses.listQuestionnaireResponses(
				createConfig('user-1'),
				'q-1'
			);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Questionnaire not found');
		});

		it('applies limit option', async () => {
			const { getDoc, getDocs, limit, questionnaireResponses } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validQuestionnaire })
			});
			getDocs.mockResolvedValueOnce({ docs: [] });

			await questionnaireResponses.listQuestionnaireResponses(createConfig('user-1'), 'q-1', {
				limit: 10
			});
			expect(limit).toHaveBeenCalledWith(10);
		});
	});

	describe('getMyQuestionnaireResponse', () => {
		it('returns null when not found', async () => {
			const { getDoc, questionnaireResponses } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await questionnaireResponses.getMyQuestionnaireResponse(
				createConfig('user-1'),
				'q-1'
			);
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toBeNull();
		});

		it('returns parsed response on success', async () => {
			const { getDoc, questionnaireResponses } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validResponse })
			});

			const result = await questionnaireResponses.getMyQuestionnaireResponse(
				createConfig('user-1'),
				'q-1'
			);
			expect(result.success).toBe(true);
			if (result.success && result.data) {
				expect(result.data.questionnaireId).toBe('q-1');
			}
		});
	});

	describe('submitQuestionnaireResponse', () => {
		it('sets courseId to null when undefined', async () => {
			const { setDoc, questionnaireResponses } = await loadModules();
			setDoc.mockResolvedValueOnce(undefined);

			const result = await questionnaireResponses.submitQuestionnaireResponse(
				createConfig('user-1'),
				'q-1',
				[{ questionIndex: 0, answer: { type: 'short_answer' as const, response: 'Hello' } }]
			);
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ courseId: null })
			);
		});
	});

	describe('updateMyQuestionnaireResponse', () => {
		it('returns error when not found after update', async () => {
			const { getDoc, updateDoc, questionnaireResponses } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await questionnaireResponses.updateMyQuestionnaireResponse(
				createConfig('user-1'),
				'q-1',
				[{ questionIndex: 0, answer: { type: 'short_answer' as const, response: 'Updated' } }]
			);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Questionnaire response not found');
		});

		it('includes updatedAt in updateDoc call', async () => {
			const { getDoc, updateDoc, questionnaireResponses } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validResponse, updatedAt: Date.now() })
			});

			const result = await questionnaireResponses.updateMyQuestionnaireResponse(
				createConfig('user-1'),
				'q-1',
				[{ questionIndex: 0, answer: { type: 'short_answer' as const, response: 'Updated' } }]
			);
			expect(result.success).toBe(true);
			expect(updateDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ updatedAt: expect.any(Number) })
			);
		});
	});
});
