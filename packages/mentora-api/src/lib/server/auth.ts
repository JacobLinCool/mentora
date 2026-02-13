/**
 * Server-side JWT authentication for Firebase
 * Framework-agnostic - uses jose library for JWT verification
 */

import {
	createRemoteJWKSet,
	jwtVerify,
	decodeJwt,
	type JWTPayload,
	type JWTVerifyResult
} from 'jose';
import type { AuthContext } from './types.js';

/**
 * Cache for JWKS to avoid repeated fetches
 */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/**
 * Get or create JWKS for a project
 */
function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
	const url =
		'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
	if (!jwksCache.has(url)) {
		jwksCache.set(url, createRemoteJWKSet(new URL(url)));
	}
	return jwksCache.get(url)!;
}

/**
 * Verify JWT signature or decode in emulator mode.
 *
 * Handles the cryptographic verification layer only; payload field
 * validation is performed separately by {@link validateAuthPayload}.
 */
async function verifyToken(
	token: string,
	projectId: string,
	options?: { skipSignatureVerification?: boolean }
): Promise<JWTPayload> {
	const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
	// Secure-by-default: only allow skipping verification in explicitly non-production environments
	const allowSkipVerification = nodeEnv === 'development' || nodeEnv === 'test';

	if (options?.skipSignatureVerification && allowSkipVerification) {
		// For Firebase Auth Emulator which uses unsigned tokens
		console.warn('[auth] Emulator mode: JWT signature verification is skipped');
		return decodeJwt(token);
	}

	if (options?.skipSignatureVerification && !allowSkipVerification) {
		console.warn(
			`[auth] skipSignatureVerification requested but ignored (NODE_ENV=${nodeEnv ?? 'unset'})`
		);
	}

	const issuer = `https://securetoken.google.com/${projectId}`;
	const jwks = getJWKS();
	const result: JWTVerifyResult = await jwtVerify(token, jwks, { issuer, audience: projectId });
	return result.payload;
}

/**
 * Validate required JWT payload fields and construct AuthContext.
 *
 * Centralises all field checks so that both emulator and production
 * paths go through identical validation logic.
 */
function validateAuthPayload(payload: JWTPayload): AuthContext {
	const rawUid = payload.user_id ?? payload.sub;
	const uid = typeof rawUid === 'string' ? rawUid : '';

	if (!uid) {
		throw new Error('Token missing valid user identifier');
	}

	if (typeof payload.email !== 'string' || !payload.email) {
		throw new Error('Token missing email claim');
	}

	if (typeof payload.email_verified !== 'boolean') {
		throw new Error('Token missing email_verified claim');
	}

	return {
		uid,
		email: payload.email,
		emailVerified: payload.email_verified,
		name: typeof payload.name === 'string' ? payload.name : undefined
	};
}

/**
 * Verify a Firebase ID token and extract user context
 *
 * @param token - The Firebase ID token from Authorization header
 * @param projectId - Firebase project ID for audience/issuer validation
 * @param options - Additional options
 * @returns AuthContext with user information
 * @throws Error if token is invalid or expired
 */
export async function verifyFirebaseIdToken(
	token: string,
	projectId: string,
	options?: { skipSignatureVerification?: boolean }
): Promise<AuthContext> {
	const payload = await verifyToken(token, projectId, options);
	return validateAuthPayload(payload);
}

/**
 * Extract Bearer token from Authorization header
 *
 * @param request - The incoming request
 * @returns The token or null if not present/invalid format
 */
export function extractBearerToken(request: Request): string | null {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}
	return authHeader.substring(7);
}

/**
 * Authenticate a request and return user context
 *
 * @param request - The incoming request
 * @param projectId - Firebase project ID
 * @param options - Additional options
 * @returns AuthContext or null if not authenticated
 */
export async function authenticateRequest(
	request: Request,
	projectId: string,
	options?: { skipSignatureVerification?: boolean }
): Promise<AuthContext | null> {
	const token = extractBearerToken(request);
	if (!token) {
		return null;
	}

	try {
		return await verifyFirebaseIdToken(token, projectId, options);
	} catch {
		return null;
	}
}
