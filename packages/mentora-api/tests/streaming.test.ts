/**
 * Integration Tests for Streaming API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests, createTestConfig } from './setup';
import * as StreamingAPI from '$lib/api/streaming';

describe('Streaming API Integration', () => {
	beforeAll(async () => {
		await setupIntegrationTests();
	});

	afterAll(async () => {
		await teardownIntegrationTests();
	});

	describe('getStreamingSession', () => {
		it('should return not implemented by default', async () => {
			const config = await createTestConfig({ authenticated: true });

			const result = await StreamingAPI.getStreamingSession(config, 'session-id');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Not implemented');
			}
		});
	});

	describe('createStreamingClient', () => {
		it('should create client instance', async () => {
			const config = await createTestConfig({ authenticated: true });

			const client = StreamingAPI.createStreamingClient(config, 'conversation-id', {});

			expect(client).toBeDefined();
			expect(typeof client.send).toBe('function');
			expect(typeof client.stop).toBe('function');
		});
	});
});
