/**
 * Server-side JWT authentication for Firebase
 * Framework-agnostic - uses jose library for JWT verification
 */

import { createRemoteJWKSet, jwtVerify, decodeJwt, type JWTVerifyResult } from 'jose';
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
	const issuer = `https://securetoken.google.com/${projectId}`;

	let payload;

	const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

	if (options?.skipSignatureVerification && !isProduction) {
		// For Firebase Auth Emulator which uses unsigned tokens
		// Emulator tokens may have different issuer/audience format
		console.warn('[auth] Emulator mode: JWT signature verification is skipped');
		payload = decodeJwt(token);

		// Just verify it has basic required fields
		if (!payload.sub && !payload.user_id) {
			throw new Error('Token missing user identifier');
		}
	} else {
		if (options?.skipSignatureVerification && isProduction) {
			console.warn(
				'[auth] skipSignatureVerification requested but ignored in production environment'
			);
		}
		const jwks = getJWKS();

		const result: JWTVerifyResult = await jwtVerify(token, jwks, {
			issuer,
			audience: projectId
		});

		payload = result.payload;
	}

	// Validate required fields before constructing AuthContext
	const uid = String(payload.user_id || payload.sub);
	if (!uid || uid === 'undefined' || uid === 'null') {
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
