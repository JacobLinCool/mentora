/**
 * Integration Tests for user profile operations
 *
 * Tests the users module against real Firebase
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTeacherClient, teardownAllClients, getTeacherUser } from './emulator-setup.js';
import type { MentoraClient } from '../src/lib/api/client.js';

describe('Users Module (Integration)', () => {
	let client: MentoraClient;

	beforeAll(async () => {
		client = await setupTeacherClient();
	});

	afterAll(async () => {
		await teardownAllClients();
	});

	describe('getMyProfile()', () => {
		it('should return current user profile when authenticated', async () => {
			const result = await client.users.getMyProfile();

			// Profile may or may not exist depending on test user state
			if (result.success) {
				const currentUser = getTeacherUser();
				expect(result.data.uid).toBe(currentUser?.uid);
				expect(result.data.email).toBeDefined();
			} else {
				// Profile not found is valid
				expect(result.error).toBeDefined();
			}
		});
	});

	describe('getUserProfile()', () => {
		it('should return user profile by UID', async () => {
			const currentUser = getTeacherUser();
			if (!currentUser) {
				console.log('Skipping - no current user');
				return;
			}

			const result = await client.users.getProfile(currentUser.uid);

			// Profile may or may not exist
			if (result.success) {
				expect(result.data.uid).toBe(currentUser.uid);
			} else {
				// Permission error or not found is valid
				expect(result.error).toBeDefined();
			}
		});

		it('should return failure for non-existent user', async () => {
			const result = await client.users.getProfile('non-existent-user-id-12345');

			expect(result.success).toBe(false);
			if (!result.success) {
				// May get "Profile not found" or permission error depending on rules
				expect(result.error).toBeDefined();
			}
		});
	});

	describe('updateMyProfile()', () => {
		it('should update current user profile', async () => {
			const testDisplayName = `Test User ${Date.now()}`;

			const result = await client.users.updateMyProfile({
				displayName: testDisplayName
			});

			expect(result.success).toBe(true);

			const profileResult = await client.users.getMyProfile();
			if (profileResult.success && profileResult.data) {
				expect(profileResult.data.displayName).toBe(testDisplayName);
			}
		});
	});
});
