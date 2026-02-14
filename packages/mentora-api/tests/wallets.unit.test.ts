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

	vi.doMock('firebase/firestore', () => ({
		doc,
		getDoc,
		getDocs,
		collection,
		query,
		where,
		orderBy,
		limit
	}));

	const wallets = await import('../src/lib/api/wallets.js');
	return { doc, getDoc, getDocs, collection, query, where, orderBy, limit, wallets };
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

const validWallet = {
	ownerType: 'user' as const,
	ownerId: 'user-1',
	balanceCredits: 100,
	createdAt: Date.now() - 60000,
	updatedAt: Date.now()
};

const validEntry = {
	type: 'topup',
	amountCredits: 50,
	idempotencyKey: 'key-1',
	scope: { courseId: null, topicId: null, assignmentId: null, conversationId: null },
	provider: { name: 'manual', ref: null },
	metadata: null,
	createdBy: 'admin-1',
	createdAt: Date.now()
};

describe('Wallets (Unit)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getWallet', () => {
		it('returns error when not found', async () => {
			const { getDoc, wallets } = await loadModules();
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const result = await wallets.getWallet(createConfig('user-1'), 'wallet-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Wallet not found');
		});

		it('returns parsed wallet on success', async () => {
			const { getDoc, wallets } = await loadModules();
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				id: 'wallet-1',
				data: () => ({ ...validWallet })
			});

			const result = await wallets.getWallet(createConfig('user-1'), 'wallet-1');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('wallet-1');
				expect(result.data.balanceCredits).toBe(100);
			}
		});
	});

	describe('getMyWallet', () => {
		it('returns null when snapshot is empty', async () => {
			const { getDocs, wallets } = await loadModules();
			getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

			const result = await wallets.getMyWallet(createConfig('user-1'));
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toBeNull();
		});

		it('returns wallet on success', async () => {
			const { getDocs, wallets } = await loadModules();
			getDocs.mockResolvedValueOnce({
				empty: false,
				docs: [{ id: 'wallet-1', data: () => ({ ...validWallet }) }]
			});

			const result = await wallets.getMyWallet(createConfig('user-1'));
			expect(result.success).toBe(true);
			if (result.success && result.data) {
				expect(result.data.id).toBe('wallet-1');
			}
		});
	});

	describe('listWalletEntries', () => {
		it('applies limit when provided', async () => {
			const { getDocs, limit, wallets } = await loadModules();
			getDocs.mockResolvedValueOnce({ docs: [] });

			await wallets.listWalletEntries(createConfig('user-1'), 'wallet-1', { limit: 5 });
			expect(limit).toHaveBeenCalledWith(5);
		});

		it('works without limit', async () => {
			const { getDocs, limit, wallets } = await loadModules();
			getDocs.mockResolvedValueOnce({
				docs: [{ id: 'entry-1', data: () => ({ ...validEntry }) }]
			});

			const result = await wallets.listWalletEntries(createConfig('user-1'), 'wallet-1');
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toHaveLength(1);
			expect(limit).not.toHaveBeenCalled();
		});
	});

	describe('getCourseWallet', () => {
		it('returns error when wallet not found (empty)', async () => {
			const { getDocs, wallets } = await loadModules();
			getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

			const result = await wallets.getCourseWallet(createConfig('user-1'), 'course-1');
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe('Wallet not found');
		});

		it('includes ledger with default limit of 20', async () => {
			const { getDocs, limit, wallets } = await loadModules();
			const hostWallet = { ...validWallet, ownerType: 'host' as const, ownerId: 'course-1' };
			getDocs
				.mockResolvedValueOnce({
					empty: false,
					docs: [{ id: 'hw-1', data: () => ({ ...hostWallet }) }]
				})
				.mockResolvedValueOnce({
					docs: [{ id: 'entry-1', data: () => ({ ...validEntry }) }]
				});

			const result = await wallets.getCourseWallet(createConfig('user-1'), 'course-1', {
				includeLedger: true
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.wallet.id).toBe('hw-1');
				expect(result.data.ledger).toHaveLength(1);
			}
			expect(limit).toHaveBeenCalledWith(20);
		});

		it('returns undefined ledger when includeLedger=false', async () => {
			const { getDocs, wallets } = await loadModules();
			const hostWallet = { ...validWallet, ownerType: 'host' as const, ownerId: 'course-1' };
			getDocs.mockResolvedValueOnce({
				empty: false,
				docs: [{ id: 'hw-1', data: () => ({ ...hostWallet }) }]
			});

			const result = await wallets.getCourseWallet(createConfig('user-1'), 'course-1', {
				includeLedger: false
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.ledger).toBeUndefined();
			}
		});
	});
});
