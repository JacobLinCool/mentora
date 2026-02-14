/**
 * Unit tests for auth secure-by-default guard and payload validation
 *
 * Verifies that JWT signature verification can only be skipped
 * when NODE_ENV is explicitly 'development' or 'test', and that
 * payload fields are validated before constructing AuthContext.
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
			protectedHeader: { alg: 'RS256' },
			key: new Uint8Array()
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
			protectedHeader: { alg: 'RS256' },
			key: new Uint8Array()
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
		).rejects.toThrow('Token missing valid user identifier');
	});

	it('enforces signature verification when NODE_ENV is unset (secure-by-default)', async () => {
		delete process.env.NODE_ENV;
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		vi.mocked(jwtVerify).mockResolvedValue({
			payload: {
				sub: 'uid-env',
				email: 'a@b.c',
				email_verified: true,
				user_id: 'uid-env'
			},
			protectedHeader: { alg: 'RS256' },
			key: new Uint8Array()
		} as Awaited<ReturnType<typeof jwtVerify>>);

		const result = await verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID, {
			skipSignatureVerification: true
		});

		// Must use full verification – skip is ignored when NODE_ENV is unset
		expect(jwtVerify).toHaveBeenCalled();
		expect(decodeJwt).not.toHaveBeenCalled();
		expect(result.uid).toBe('uid-env');
		expect(warnSpy).toHaveBeenCalledWith(
			'[auth] skipSignatureVerification requested but ignored (NODE_ENV=unset)'
		);
		warnSpy.mockRestore();
	});
});

describe('verifyFirebaseIdToken – payload validation', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	it('rejects token with missing email claim', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(jwtVerify).mockResolvedValue({
			payload: {
				sub: 'uid-1',
				email_verified: true,
				user_id: 'uid-1'
				// email is missing
			},
			protectedHeader: { alg: 'RS256' },
			key: new Uint8Array()
		} as Awaited<ReturnType<typeof jwtVerify>>);

		await expect(verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID)).rejects.toThrow(
			'Token missing email claim'
		);
	});

	it('rejects token with missing email_verified claim', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(jwtVerify).mockResolvedValue({
			payload: {
				sub: 'uid-2',
				email: 'a@b.c',
				user_id: 'uid-2'
				// email_verified is missing
			},
			protectedHeader: { alg: 'RS256' },
			key: new Uint8Array()
		} as Awaited<ReturnType<typeof jwtVerify>>);

		await expect(verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID)).rejects.toThrow(
			'Token missing email_verified claim'
		);
	});

	it('rejects token where uid resolves to "undefined"', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(jwtVerify).mockResolvedValue({
			payload: {
				// Neither sub nor user_id present
				email: 'a@b.c',
				email_verified: true
			},
			protectedHeader: { alg: 'RS256' },
			key: new Uint8Array()
		} as Awaited<ReturnType<typeof jwtVerify>>);

		await expect(verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID)).rejects.toThrow(
			'Token missing valid user identifier'
		);
	});

	it('rejects token with empty string uid', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(decodeJwt).mockReturnValue({
			sub: '',
			user_id: '',
			email: 'a@b.c',
			email_verified: true
		} as ReturnType<typeof decodeJwt>);

		await expect(
			verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID, {
				skipSignatureVerification: true
			})
		).rejects.toThrow('Token missing valid user identifier');
	});

	it('rejects token with empty string email', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(jwtVerify).mockResolvedValue({
			payload: {
				sub: 'uid-empty-email',
				email: '',
				email_verified: true,
				user_id: 'uid-empty-email'
			},
			protectedHeader: { alg: 'RS256' },
			key: new Uint8Array()
		} as Awaited<ReturnType<typeof jwtVerify>>);

		await expect(verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID)).rejects.toThrow(
			'Token missing email claim'
		);
	});

	it('accepts token with email_verified set to false', async () => {
		process.env.NODE_ENV = 'development';

		vi.mocked(jwtVerify).mockResolvedValue({
			payload: {
				sub: 'uid-unverified',
				email: 'unverified@b.c',
				email_verified: false,
				user_id: 'uid-unverified'
			},
			protectedHeader: { alg: 'RS256' },
			key: new Uint8Array()
		} as Awaited<ReturnType<typeof jwtVerify>>);

		const result = await verifyFirebaseIdToken(FAKE_TOKEN, PROJECT_ID);
		expect(result.emailVerified).toBe(false);
		expect(result.uid).toBe('uid-unverified');
	});
});
