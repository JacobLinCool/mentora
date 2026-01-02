/**
 * Auth restoration utilities for CLI
 * Provides functionality to restore auth session from stored credentials
 */
import {
    GithubAuthProvider,
    GoogleAuthProvider,
    signInWithCredential,
    type Auth,
    type AuthCredential,
    type User,
} from "firebase/auth";

export interface StoredCredential {
    providerId: string;
    idToken?: string;
    accessToken?: string;
}

export interface StoredAuthData {
    credential?: StoredCredential;
}

/**
 * Convert stored credential data to Firebase AuthCredential
 */
export function createCredential(
    stored: StoredCredential,
): AuthCredential | null {
    if (stored.providerId === GoogleAuthProvider.PROVIDER_ID) {
        return GoogleAuthProvider.credential(
            stored.idToken,
            stored.accessToken,
        );
    } else if (stored.providerId === GithubAuthProvider.PROVIDER_ID) {
        return GithubAuthProvider.credential(stored.accessToken || "");
    }
    return null;
}

/**
 * Restore auth session from stored auth data
 * Returns the authenticated user if successful, otherwise null
 */
export async function restoreAuthFromStoredData(
    auth: Auth,
    authDataJson: string | undefined,
): Promise<User | null> {
    if (!authDataJson) {
        return null;
    }

    try {
        const authData: StoredAuthData = JSON.parse(authDataJson);

        if (!authData.credential) {
            return null;
        }

        const credential = createCredential(authData.credential);
        if (!credential) {
            return null;
        }

        const result = await signInWithCredential(auth, credential);
        return result.user;
    } catch {
        // Failed to restore auth, return null
        return null;
    }
}
