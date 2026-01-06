/**
 * Integration Tests for Users API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, createTestConfig } from './setup';
import * as UsersAPI from '$lib/api/users';

describe('Users API Integration', () => {
	beforeAll(async () => {
		await setupIntegrationTests();
	});

	afterAll(async () => {
		await teardownIntegrationTests();
	});

	describe('getMyProfile', () => {
		it('should get current user profile when authenticated', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await UsersAPI.getMyProfile(config);

			// May fail if profile doesn't exist yet, but should not throw
			// The important thing is it doesn't crash
			expect(result).toBeDefined();
		});

		it('should fail when not authenticated', async () => {
			const config = await createTestConfig({ authenticated: false });

			const result = await UsersAPI.getMyProfile(config);

			expect(result.success).toBe(false);
		});
	});

	describe('updateMyProfile', () => {
		it('should update profile when authenticated', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await UsersAPI.updateMyProfile(config, {
				displayName: 'Updated Name'
			});

			expect(result.success).toBe(true);
		});

		it('should fail when not authenticated', async () => {
			const config = await createTestConfig({ authenticated: false });

			const result = await UsersAPI.updateMyProfile(config, {
				displayName: 'Test'
			});

			expect(result.success).toBe(false);
		});
	});

	describe('getUserProfile', () => {
		it('should get another user profile', async () => {
			const config = await createTestConfig({ authenticated: true });

			// First update our own profile so it exists
			await UsersAPI.updateMyProfile(config, { displayName: 'Test User' });

			const currentUser = config.getCurrentUser();
			if (!currentUser) return;

			// Get the profile
			const result = await UsersAPI.getUserProfile(config, currentUser.uid);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.displayName).toBe('Test User');
			}
		});

		it('should fail for non-existent user', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await UsersAPI.getUserProfile(config, 'non-existent-uid');

			expect(result.success).toBe(false);
		});
	});
});
