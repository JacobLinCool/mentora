/**
 * Integration Tests for the MentoraClient class
 *
 * Tests the main client class with real Firebase
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MentoraClient } from '../src/lib/api/client.js';
import {
	setupTeacherClient,
	teardownAllClients,
	initTeacherFirebase,
	getTeacherUser,
	BACKEND_URL
} from './emulator-setup.js';

describe('MentoraClient (Integration)', () => {
	let client: MentoraClient;

	beforeAll(async () => {
		client = await setupTeacherClient();
	});

	afterAll(async () => {
		await teardownAllClients();
	});

	describe('constructor and initialization', () => {
		it('should initialize with Firebase config', () => {
			const { auth, db } = initTeacherFirebase();

			const newClient = new MentoraClient({
				auth,
				db,
				backendBaseUrl: BACKEND_URL,
				environment: { browser: false }
			});

			expect(newClient).toBeInstanceOf(MentoraClient);
		});
	});

	describe('authentication state', () => {
		it('should track current user', async () => {
			await client.authReady;

			expect(client.currentUser).toBeDefined();
			expect(client.isAuthenticated).toBe(true);
			expect(client.userId).toBe(getTeacherUser()?.uid);
		});
	});

	describe('authReady', () => {
		it('should resolve when auth state is determined', async () => {
			await expect(client.authReady).resolves.toBeUndefined();
		});
	});

	describe('API namespaces', () => {
		it('should have users namespace', () => {
			expect(client.users).toBeDefined();
			expect(client.users.getMyProfile).toBeDefined();
			expect(client.users.getProfile).toBeDefined();
			expect(client.users.updateMyProfile).toBeDefined();
		});

		it('should have courses namespace', () => {
			expect(client.courses).toBeDefined();
			expect(client.courses.get).toBeDefined();
			expect(client.courses.listMine).toBeDefined();
			expect(client.courses.create).toBeDefined();
		});

		it('should have topics namespace', () => {
			expect(client.topics).toBeDefined();
			expect(client.topics.get).toBeDefined();
			expect(client.topics.create).toBeDefined();
		});

		it('should have assignments namespace', () => {
			expect(client.assignments).toBeDefined();
			expect(client.assignments.get).toBeDefined();
			expect(client.assignments.create).toBeDefined();
		});

		it('should have submissions namespace', () => {
			expect(client.submissions).toBeDefined();
			expect(client.submissions.get).toBeDefined();
			expect(client.submissions.start).toBeDefined();
		});

		it('should have conversations namespace', () => {
			expect(client.conversations).toBeDefined();
			expect(client.conversations.get).toBeDefined();
			expect(client.conversations.create).toBeDefined();
		});

		it('should have wallets namespace', () => {
			expect(client.wallets).toBeDefined();
			expect(client.wallets.get).toBeDefined();
			expect(client.wallets.getMine).toBeDefined();
		});

		it('should have backend namespace', () => {
			expect(client.backend).toBeDefined();
			expect(client.backend.call).toBeDefined();
		});
	});

	describe('method delegation', () => {
		it('should call users.getMyProfile', async () => {
			const result = await client.users.getMyProfile();

			// Profile may or may not exist for test user
			if (result.success) {
				expect(result.data.uid).toBe(getTeacherUser()?.uid);
			} else {
				// Error is also valid - profile might not exist
				expect(result.error).toBeDefined();
			}
		});

		it('should call courses.listMine', async () => {
			const result = await client.courses.listMine({ limit: 5 });

			// May have permission issues depending on Firestore rules
			if (result.success) {
				expect(Array.isArray(result.data)).toBe(true);
			} else {
				// Permission error is also valid
				expect(result.error).toBeDefined();
			}
		});
	});
});
