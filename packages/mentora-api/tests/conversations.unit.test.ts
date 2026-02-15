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

	vi.doMock('firebase/firestore', () => ({
		doc,
		getDoc,
		getDocs,
		collection,
		query,
		where,
		orderBy,
		limit,
		onSnapshot
	}));

	const conversations = await import('../src/lib/api/conversations.js');
	return {
		doc,
		getDoc,
		getDocs,
		collection,
		query,
		where,
		orderBy,
		limit,
		onSnapshot,
		conversations
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

const validConversation = {
	assignmentId: 'assign-1',
	userId: 'user-1',
	state: 'awaiting_idea' as const,
	lastActionAt: Date.now(),
	createdAt: Date.now() - 60000,
	updatedAt: Date.now(),
	turns: [],
	tokenUsage: null
};

describe('Conversations (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getConversation', () => {
		it('returns error when not found', async () => {
			const { getDoc, conversations } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await conversations.getConversation(createConfig('user-1'), 'conv-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Conversation not found');
		});

		it('returns parsed conversation with id on success', async () => {
			const { getDoc, conversations } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				id: 'conv-1',
				data: () => ({ ...validConversation })
			});

			const result = await conversations.getConversation(createConfig('user-1'), 'conv-1');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('conv-1');
				expect(result.data.state).toBe('awaiting_idea');
			}
		});
	});

	describe('getAssignmentConversation', () => {
		it('uses explicit userId override', async () => {
			const { getDocs, where, conversations } = await loadModules();
			getDocs.mockResolvedValueOnce({
				empty: false,
				docs: [{ id: 'conv-1', data: () => ({ ...validConversation }) }]
			});

			await conversations.getAssignmentConversation(
				createConfig('user-1'),
				'assign-1',
				'override-user'
			);
			expect(where).toHaveBeenCalledWith('userId', '==', 'override-user');
		});

		it('falls back to currentUser.uid', async () => {
			const { getDocs, where, conversations } = await loadModules();
			getDocs.mockResolvedValueOnce({
				empty: false,
				docs: [{ id: 'conv-1', data: () => ({ ...validConversation }) }]
			});

			await conversations.getAssignmentConversation(createConfig('user-1'), 'assign-1');
			expect(where).toHaveBeenCalledWith('userId', '==', 'user-1');
		});

		it('returns error when query is empty', async () => {
			const { getDocs, conversations } = await loadModules();
			getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

			const result = await conversations.getAssignmentConversation(
				createConfig('user-1'),
				'assign-1'
			);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Conversation not found');
		});
	});

	describe('listMyConversations', () => {
		it('applies limit when provided', async () => {
			const { getDocs, limit, conversations } = await loadModules();
			getDocs.mockResolvedValueOnce({ docs: [] });

			await conversations.listMyConversations(createConfig('user-1'), { limit: 5 });
			expect(limit).toHaveBeenCalledWith(5);
		});

		it('works without limit', async () => {
			const { getDocs, limit, conversations } = await loadModules();
			getDocs.mockResolvedValueOnce({
				docs: [{ id: 'conv-1', data: () => ({ ...validConversation }) }]
			});

			const result = await conversations.listMyConversations(createConfig('user-1'));
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toHaveLength(1);
			expect(limit).not.toHaveBeenCalled();
		});
	});
});
