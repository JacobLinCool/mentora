/**
 * Unit tests for health route definitions
 *
 * Verifies that /health/firestore requires authentication
 * and returns minimal liveness data without collection counts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('jose', () => ({
	createRemoteJWKSet: vi.fn(() => vi.fn()),
	jwtVerify: vi.fn(),
	decodeJwt: vi.fn()
}));

vi.mock('../src/lib/server/routes/index.js', () => ({
	allRoutes: []
}));

import { MentoraServerHandler } from '../src/lib/server/handler.js';
import { healthRoutes } from '../src/lib/server/routes/health.js';
import { decodeJwt } from 'jose';

describe('/health routes', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	function createHandler() {
		const firestoreMock = {
			collection: vi.fn(() => ({
				count: vi.fn(() => Promise.resolve({ data: () => ({ count: 0 }) }))
			}))
		};
		const handler = new MentoraServerHandler({
			firestore: firestoreMock as never,
			projectId: 'test-project',
			useEmulator: true
		});
		handler.registerAll(healthRoutes);
		return handler;
	}

	describe('/health (public)', () => {
		it('returns ok without authentication', async () => {
			const handler = createHandler();
			const request = new Request('http://localhost/health');

			const response = await handler.handle('/health', request);
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data.status).toBe('ok');
		});
	});

	describe('/health/firestore (requires auth)', () => {
		it('rejects unauthenticated requests', async () => {
			const handler = createHandler();
			const request = new Request('http://localhost/health/firestore');

			const response = await handler.handle('/health/firestore', request);
			expect(response.status).toBe(401);
		});

		it('allows authenticated requests and returns minimal data', async () => {
			process.env.NODE_ENV = 'development';

			vi.mocked(decodeJwt).mockReturnValue({
				sub: 'test-uid',
				email: 'test@example.com',
				email_verified: true,
				user_id: 'test-uid'
			} as ReturnType<typeof decodeJwt>);

			const handler = createHandler();
			const request = new Request('http://localhost/health/firestore', {
				headers: { Authorization: 'Bearer fake-token' }
			});

			const response = await handler.handle('/health/firestore', request);
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data.status).toBe('ok');
			// Must NOT contain collection counts
			expect(body.data.user).toBeUndefined();
			expect(body.data.course).toBeUndefined();
			expect(body.data.assignment).toBeUndefined();
			expect(body.data.conversation).toBeUndefined();
		});
	});
});
