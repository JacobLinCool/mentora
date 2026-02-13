/**
 * Unit tests for auth production guard
 *
 * Verifies that JWT signature verification cannot be skipped
 * when NODE_ENV=production, regardless of the useEmulator flag.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test verifyFirebaseIdToken directly
// Mock jose so we don't need real JWKs or network access
vi.mock('jose', () => ({
	createRemoteJWKSet: vi.fn(() => vi.fn()),
	jwtVerify: vi.fn(),
	decodeJwt: vi.fn()
}));

import { verifyFirebaseIdToken } from '../src/lib/server/auth.js';
import { jwtVerify, decodeJwt } from 'jose';

const FAKE_TOKEN =
	'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVpZCIsImVtYWlsIjoiYUBiLmMiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwidXNlcl9pZCI6InRlc3QtdWlkIn0.fake';
const PROJECT_ID = 'test-project';

describe('verifyFirebaseIdToken – production guard', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	it('skips signature verification in development when requested', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(decodeJwt).mockReturnValue({
			sub: 'test-uid',
			email: 'a@b.c',
			email_verified: true,
			user_id: 'test-uid'
		} as ReturnType<typeof decodeJwt>);

		const result = await verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID, {
			skipSignatureVerification: true
		});

		expect(decodeJwt).toHaveBeenCalledWith(FAKE_TOKEN);
		expect(jwtVerify).not.toHaveBeenCalled();
		expect(result.uid).toBe('test-uid');
	});

	it('enforces signature verification in production even when skip is requested', async () => {
		process.env.NODE_ENV = 'production';

		vi.mocked(jwtVerify).mockResolvedValue({
			payload: {
				sub: 'prod-uid',
				email: 'a@b.c',
				email_verified: true,
				user_id: 'prod-uid'
			},
			protectedHeader: { alg: 'RS256' }
		} as Awaited<ReturnType<typeof jwtVerify>>);

		const result = await verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID, {
			skipSignatureVerification: true
		});

		// Must use full verification even though skip was requested
		expect(jwtVerify).toHaveBeenCalled();
		expect(decodeJwt).not.toHaveBeenCalled();
		expect(result.uid).toBe('prod-uid');
	});

	it('uses full verification when skipSignatureVerification is not set', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(jwtVerify).mockResolvedValue({
			payload: {
				sub: 'verified-uid',
				email: 'a@b.c',
				email_verified: true,
				user_id: 'verified-uid'
			},
			protectedHeader: { alg: 'RS256' }
		} as Awaited<ReturnType<typeof jwtVerify>>);

		const result = await verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID);

		expect(jwtVerify).toHaveBeenCalled();
		expect(decodeJwt).not.toHaveBeenCalled();
		expect(result.uid).toBe('verified-uid');
	});

	it('rejects emulator token missing user identifier', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(decodeJwt).mockReturnValue({
			iss: 'test'
			// Missing both sub and user_id
		} as ReturnType<typeof decodeJwt>);

		await expect(
			verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID, {
				skipSignatureVerification: true
			})
		).rejects.toThrow('Token missing user identifier');
	});
});
