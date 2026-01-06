import { PUBLIC_FIREBASE_PROJECT_ID } from "$env/static/public";
import { error, type RequestEvent } from "@sveltejs/kit";
import { createRemoteJWKSet, jwtVerify } from "jose";

const issuer = `https://securetoken.google.com/${PUBLIC_FIREBASE_PROJECT_ID}`;
const audience = PUBLIC_FIREBASE_PROJECT_ID;
const jwks = createRemoteJWKSet(
    new URL(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    ),
);

export interface FirebaseUser {
    uid: string;
    email: string;
    emailVerified: boolean;
    name?: string;
}

import { env } from "$env/dynamic/private";
import { decodeJwt } from "jose";

export async function verifyFirebaseIdToken(
    idToken: string,
): Promise<FirebaseUser> {
    // Try to get emulator host from various sources
    let emulatorHost: string | undefined = env.FIREBASE_AUTH_EMULATOR_HOST;
    if (!emulatorHost && typeof process !== "undefined" && process.env) {
        emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    }

    if (emulatorHost) {
        // In emulator environment, we skip signature verification
        const payload = decodeJwt(idToken);
        return {
            uid: String(payload.user_id || payload.sub),
            email: payload.email as string,
            emailVerified: payload.email_verified as boolean,
            name: payload.name as string | undefined,
        };
    }

    const { payload } = await jwtVerify(idToken, jwks, { issuer, audience });
    return {
        uid: String(payload.user_id || payload.sub),
        email: payload.email as string,
        emailVerified: payload.email_verified as boolean,
        name: payload.name as string | undefined,
    };
}

/**
 * Verify Firebase ID token using JWT verification
 */
export async function requireAuth(event: RequestEvent): Promise<FirebaseUser> {
    const authHeader = event.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw error(401, "Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);

    try {
        const user = await verifyFirebaseIdToken(token);
        return user;
    } catch (err) {
        console.error("Token verification failed:", err);
        throw error(401, "Invalid or expired token");
    }
}

/**
 * Optional auth - returns user if authenticated, null otherwise
 */
export async function optionalAuth(
    event: RequestEvent,
): Promise<FirebaseUser | null> {
    try {
        return await requireAuth(event);
    } catch {
        return null;
    }
}
