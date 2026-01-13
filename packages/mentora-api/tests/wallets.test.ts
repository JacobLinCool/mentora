/**
 * Integration Tests for wallet operations
 *
 * Tests the wallets module against real Firebase
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTeacherClient, teardownAllClients, generateTestId } from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Wallets Module (Integration)', () => {
	let client: MentoraClient;
	let testCourseId: string | null = null;

	beforeAll(async () => {
		client = await setupTeacherClient();

		// Create a test course for getCourseWallet test
		const courseResult = await client.courses.create(
			`Test Course for Wallets ${generateTestId()}`,
			`TW${Date.now().toString().slice(-6)}`,
			{ visibility: 'private' }
		);
		if (courseResult.success) {
			testCourseId = courseResult.data;
		}
	});

	afterAll(async () => {
		if (testCourseId) {
			try {
				await client.courses.delete(testCourseId);
			} catch {
				// Ignore cleanup errors
			}
		}
		await teardownAllClients();
	});

	describe('getMyWallet()', () => {
		it('should get current user wallet or handle missing wallet', async () => {
			const result = await client.wallets.getMine();
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data).toBeDefined();
				if (result.data) {
					expect(result.data.id).toBeDefined();
					expect(result.data.balanceCredits).toBeDefined();
				}
			}
		});
	});

	describe('getWallet()', () => {
		it('should get wallet by ID if user owns it', async () => {
			// First get user's wallet
			const myWallet = await client.wallets.getMine();

			if (!myWallet.success || !myWallet.data) {
				console.log('Skipping - no wallet for test user');
				return;
			}

			// Now try to get it by ID
			const result = await client.wallets.get(myWallet.data.id);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.id).toBe(myWallet.data.id);
			}
		});

		it('should fail for non-existent wallet', async () => {
			const result = await client.wallets.get('non-existent-wallet-id-12345');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});
	});

	describe('listWalletEntries()', () => {
		it('should list wallet entries if wallet exists', async () => {
			const walletResult = await client.wallets.getMine();

			if (!walletResult.success || !walletResult.data) {
				console.log('Skipping - no wallet for test user');
				return;
			}

			const result = await client.wallets.listEntries(walletResult.data.id, { limit: 10 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			}
		});
	});

	describe('addCredits()', () => {
		it('should call backend to add credits', async () => {
			const result = await client.wallets.addCredits(100, 'usd');

			// Backend may not be running in test environment
			if (!result.success && result.error?.includes('fetch')) {
				console.log('Skipping - backend not available');
				return;
			}

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBeDefined();
			}
		});
	});
});
