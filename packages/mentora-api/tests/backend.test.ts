/**
 * Integration Tests for the backend API module
 *
 * Tests the callBackend function with real authentication
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callBackend } from '../src/lib/api/backend.js';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';
import {
	setupTeacherClient,
	teardownAllClients,
	initTeacherFirebase,
	getTeacherUser,
	BACKEND_URL
} from './emulator-setup.js';

describe('Backend Module (Integration)', () => {
	let config: MentoraAPIConfig;

	beforeAll(async () => {
		await setupTeacherClient();
		const { auth, db } = initTeacherFirebase();
		config = {
			auth,
			db,
			backendBaseUrl: BACKEND_URL,
			environment: { browser: false },
			getCurrentUser: () => getTeacherUser()
		};
	});

	afterAll(async () => {
		await teardownAllClients();
	});

	describe('callBackend()', () => {
		it('should return success for health check', async () => {
			const result = await callBackend<unknown>(config, '/health');
			expect(result.success).toBe(true);
		});
	});
});
