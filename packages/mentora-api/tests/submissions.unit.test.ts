import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';

type FirestoreModuleMocks = {
	doc: ReturnType<typeof vi.fn>;
	getDoc: ReturnType<typeof vi.fn>;
	getDocs: ReturnType<typeof vi.fn>;
	setDoc: ReturnType<typeof vi.fn>;
	updateDoc: ReturnType<typeof vi.fn>;
	collection: ReturnType<typeof vi.fn>;
	query: ReturnType<typeof vi.fn>;
	where: ReturnType<typeof vi.fn>;
	orderBy: ReturnType<typeof vi.fn>;
	limit: ReturnType<typeof vi.fn>;
};

async function loadModules(): Promise<
	FirestoreModuleMocks & {
		submissions: typeof import('../src/lib/api/submissions.js');
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
	const setDoc = vi.fn();
	const updateDoc = vi.fn();
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

	vi.doMock('firebase/firestore', () => ({
		doc,
		getDoc,
		getDocs,
		setDoc,
		updateDoc,
		collection,
		query,
		where,
		orderBy,
		limit
	}));

	const submissions = await import('../src/lib/api/submissions.js');
	return {
		doc,
		getDoc,
		getDocs,
		setDoc,
		updateDoc,
		collection,
		query,
		where,
		orderBy,
		limit,
		submissions
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

const validSubmission = {
	userId: 'user-1',
	state: 'in_progress' as const,
	startedAt: Date.now(),
	submittedAt: null,
	late: false,
	scoreCompletion: null,
	notes: null
};

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

describe('Submissions (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getSubmission', () => {
		it('returns error when doc not found', async () => {
			const { getDoc, submissions } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await submissions.getSubmission(createConfig('user-1'), 'assign-1', 'user-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Submission not found');
		});

		it('returns parsed data with id on success', async () => {
			const { getDoc, submissions } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				id: 'user-1',
				data: () => ({ ...validSubmission })
			});

			const result = await submissions.getSubmission(createConfig('user-1'), 'assign-1', 'user-1');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('user-1');
				expect(result.data.state).toBe('in_progress');
			}
		});
	});

	describe('listAssignmentSubmissions', () => {
		it('applies where/orderBy/limit options', async () => {
			const { getDocs, where, orderBy, limit, submissions } = await loadModules();
			getDocs.mockResolvedValueOnce({ docs: [] });

			await submissions.listAssignmentSubmissions(createConfig('user-1'), 'assign-1', {
				where: [{ field: 'state', op: '==', value: 'submitted' }],
				orderBy: { field: 'submittedAt', direction: 'asc' },
				limit: 10
			});

			expect(where).toHaveBeenCalledWith('state', '==', 'submitted');
			expect(orderBy).toHaveBeenCalledWith('submittedAt', 'asc');
			expect(limit).toHaveBeenCalledWith(10);
		});

		it('uses default orderBy when none specified', async () => {
			const { getDocs, orderBy, submissions } = await loadModules();
			getDocs.mockResolvedValueOnce({ docs: [] });

			await submissions.listAssignmentSubmissions(createConfig('user-1'), 'assign-1');

			expect(orderBy).toHaveBeenCalledWith('startedAt', 'desc');
		});
	});

	describe('startSubmission', () => {
		it('returns error when assignment not found', async () => {
			const { getDoc, submissions } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await submissions.startSubmission(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Assignment not found');
		});

		it('rejects resubmission when state=submitted and allowResubmit=false', async () => {
			const { getDoc, submissions } = await loadModules();
			getDoc
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ ...validAssignment, allowResubmit: false })
				})
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ ...validSubmission, state: 'submitted' })
				});

			const result = await submissions.startSubmission(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Resubmission not allowed');
		});

		it('rejects resubmission when state=graded_complete and allowResubmit=false', async () => {
			const { getDoc, submissions } = await loadModules();
			getDoc
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ ...validAssignment, allowResubmit: false })
				})
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ ...validSubmission, state: 'graded_complete' })
				});

			const result = await submissions.startSubmission(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Resubmission not allowed');
		});

		it('allows resubmission when state=submitted and allowResubmit=true', async () => {
			const { getDoc, setDoc, submissions } = await loadModules();
			getDoc
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ ...validAssignment, allowResubmit: true })
				})
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ ...validSubmission, state: 'submitted' })
				});
			setDoc.mockResolvedValueOnce(undefined);

			const result = await submissions.startSubmission(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalled();
		});

		it('succeeds when no existing submission', async () => {
			const { getDoc, setDoc, submissions } = await loadModules();
			getDoc
				.mockResolvedValueOnce({ exists: () => true, data: () => ({ ...validAssignment }) })
				.mockResolvedValueOnce({ exists: () => false });
			setDoc.mockResolvedValueOnce(undefined);

			const result = await submissions.startSubmission(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalled();
		});
	});

	describe('submitAssignment', () => {
		it('returns error when assignment not found', async () => {
			const { getDoc, submissions } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await submissions.submitAssignment(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Assignment not found');
		});

		it('rejects late submission when allowLate=false', async () => {
			const { getDoc, submissions } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validAssignment, dueAt: Date.now() - 100000, allowLate: false })
			});

			const result = await submissions.submitAssignment(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Late submissions are not allowed');
		});

		it('accepts late submission with late=true when allowLate=true', async () => {
			const { getDoc, updateDoc, submissions } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validAssignment, dueAt: Date.now() - 100000, allowLate: true })
			});
			updateDoc.mockResolvedValueOnce(undefined);

			const result = await submissions.submitAssignment(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(true);
			expect(updateDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ late: true, state: 'submitted' })
			);
		});

		it('sets late=false for on-time submission', async () => {
			const { getDoc, updateDoc, submissions } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ ...validAssignment, dueAt: Date.now() + 100000, allowLate: false })
			});
			updateDoc.mockResolvedValueOnce(undefined);

			const result = await submissions.submitAssignment(createConfig('user-1'), 'assign-1');
			expect(result.success).toBe(true);
			expect(updateDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ late: false, state: 'submitted' })
			);
		});
	});

	describe('gradeSubmission', () => {
		it('returns error when not found after update', async () => {
			const { getDoc, updateDoc, submissions } = await loadModules();
			updateDoc.mockResolvedValueOnce(undefined);
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await submissions.gradeSubmission(
				createConfig('user-1'),
				'assign-1',
				'user-1',
				{
					scoreCompletion: 90
				}
			);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Submission not found');
		});
	});
});
