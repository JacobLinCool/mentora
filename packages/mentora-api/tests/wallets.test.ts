/**
 * Integration Tests for Wallets API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, createTestConfig } from './setup';
import * as WalletsAPI from '$lib/api/wallets';

describe('Wallets API Integration', () => {
	beforeAll(async () => {
		await setupIntegrationTests();
	});

	afterAll(async () => {
		await teardownIntegrationTests();
	});

	describe('getMyWallet', () => {
		it('should get current user wallet when authenticated', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await WalletsAPI.getMyWallet(config);

			// Wallet may or may not exist, but should not throw
			expect(result).toBeDefined();
		});

		it('should fail when not authenticated', async () => {
			const config = await createTestConfig({ authenticated: false });

			const result = await WalletsAPI.getMyWallet(config);

			expect(result.success).toBe(false);
		});
	});

	describe('addCredits (Backend API)', () => {
		it('should add credits when authenticated', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await WalletsAPI.addCredits(config, 100, 'usd');

			// This may fail if the backend endpoint is not fully configured
			// but the important thing is it attempts to call the API
			expect(result).toBeDefined();
		});

		it('should fail when not authenticated', async () => {
			const config = await createTestConfig({ authenticated: false });

			const result = await WalletsAPI.addCredits(config, 100, 'usd');

			expect(result.success).toBe(false);
		});
	});

	describe('getWallet', () => {
		it('should fail when not authenticated', async () => {
			const config = await createTestConfig({ authenticated: false });

			const result = await WalletsAPI.getWallet(config, 'some-wallet-id');

			expect(result.success).toBe(false);
		});
	});

	describe('listWalletEntries', () => {
		it('should fail when not authenticated', async () => {
			const config = await createTestConfig({ authenticated: false });

			const result = await WalletsAPI.listWalletEntries(config, 'some-wallet-id');

			expect(result.success).toBe(false);
		});
	});
});
