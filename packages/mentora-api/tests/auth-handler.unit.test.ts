/**
 * Integration-style tests for auth flow through MentoraServerHandler
 *
 * Verifies that the NODE_ENV production guard works end-to-end
 * when requests flow through the handler's authentication pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('jose', () => ({
	createRemoteJWKSet: vi.fn(() => vi.fn()),
	jwtVerify: vi.fn(),
	decodeJwt: vi.fn()
}));

// Mock routes to avoid importing the full route tree and its dependencies
vi.mock('../src/lib/server/routes/index.js', () => ({
	allRoutes: []
}));

import { MentoraServerHandler } from '../src/lib/server/handler.js';
import { jwtVerify, decodeJwt } from 'jose';

const FAKE_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVpZCJ9.fake';

describe('Handler auth integration – NODE_ENV guard', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	function createHandler(useEmulator: boolean) {
		const handler = new MentoraServerHandler({
			firestore: {} as never,
			projectId: 'test-project',
			useEmulator
		});
		handler.get('/test', async (ctx) => {
			return new Response(JSON.stringify({ uid: ctx.user?.uid }), {
				headers: { 'Content-Type': 'application/json' }
			});
		});
		return handler;
	}

	it('rejects unsigned emulator token in production even with useEmulator=true', async () => {
		process.env.NODE_ENV = 'production';

		vi.mocked(jwtVerify).mockRejectedValue(new Error('signature verification failed'));

		const handler = createHandler(true);
		const request = new Request('http://localhost/test', {
			headers: { Authorization: `Bearer ${FAKE_TOKEN}` }
		});

		const response = await handler.handle('/test', request);
		expect(response.status).toBe(401);
		expect(decodeJwt).not.toHaveBeenCalled();
		expect(jwtVerify).toHaveBeenCalled();
	});

	it('allows emulator token in development with useEmulator=true', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(decodeJwt).mockReturnValue({
			sub: 'emu-uid',
			email: 'test@example.com',
			email_verified: true,
			user_id: 'emu-uid'
		} as ReturnType<typeof decodeJwt>);

		const handler = createHandler(true);
		const request = new Request('http://localhost/test', {
			headers: { Authorization: `Bearer ${FAKE_TOKEN}` }
		});

		const response = await handler.handle('/test', request);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.uid).toBe('emu-uid');
		expect(decodeJwt).toHaveBeenCalled();
		expect(jwtVerify).not.toHaveBeenCalled();
	});

	it('rejects token with invalid payload through handler', async () => {
		process.env.NODE_ENV = 'development';

		// Token decodes but has no email
		vi.mocked(decodeJwt).mockReturnValue({
			sub: 'uid-no-email',
			user_id: 'uid-no-email',
			email_verified: true
		} as ReturnType<typeof decodeJwt>);

		const handler = createHandler(true);
		const request = new Request('http://localhost/test', {
			headers: { Authorization: `Bearer ${FAKE_TOKEN}` }
		});

		// authenticateRequest catches the error and returns null → 401
		const response = await handler.handle('/test', request);
		expect(response.status).toBe(401);
	});
});
