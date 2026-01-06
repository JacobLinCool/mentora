/**
 * CLI API Client
 * Extends MentoraClient from mentora-api with CLI-specific features
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
    getAuth,
    signInWithCredential,
    signOut,
    type AuthCredential,
    type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { MentoraClient } from "mentora-api";
import { getConfig, type MentoraConfig } from "./config.js";
import { restoreAuthFromStoredData } from "./utils/auth-restore.js";

// Re-export types from mentora-api
export type {
    APIResult,
    Assignment,
    Conversation,
    CourseDoc,
    CourseMembership,
    LedgerEntry,
    QueryOptions,
    Submission,
    Topic,
    UserProfile,
    Wallet,
} from "mentora-api";

/**
 * CLI-specific Mentora client with file-based Firebase Auth persistence
 */
export class MentoraCLIClient extends MentoraClient {
    private _app: FirebaseApp;
    private _cliAuthReadyPromise: Promise<void>;

    constructor(config?: Partial<MentoraConfig>) {
        const cliConfig = { ...getConfig(), ...config };

        if (!cliConfig.projectId || !cliConfig.apiKey) {
            throw new Error(
                "Missing Firebase configuration. Set MENTORA_FIREBASE_PROJECT_ID and MENTORA_API_KEY environment variables, or run 'mentora config set'.",
            );
        }

        const app = initializeApp({
            projectId: cliConfig.projectId,
            apiKey: cliConfig.apiKey,
            authDomain:
                cliConfig.authDomain ||
                `${cliConfig.projectId}.firebaseapp.com`,
        });

        // Initialize auth with file-based persistence for CLI
        const auth = getAuth(app);
        const db = getFirestore(app);

        // Call parent constructor with initialized Firebase instances
        super({
            auth,
            db,
            backendBaseUrl:
                cliConfig.backendBaseUrl ||
                `https://${cliConfig.projectId}.web.app`,
            environment: { browser: false },
        });

        this._app = app;

        // Wait for persistence setup and auth state restoration
        this._cliAuthReadyPromise = auth.authStateReady().then(async () => {
            this._currentUser = auth.currentUser;

            // If not authenticated but we have stored auth data, try to restore
            if (!this._currentUser && cliConfig.authData) {
                const restoredUser = await restoreAuthFromStoredData(
                    auth,
                    cliConfig.authData,
                );
                if (restoredUser) {
                    this._currentUser = restoredUser;
                }
            }
        });
    }

    /**
     * Wait for auth state to be restored from file-based persistence
     */
    async waitForAuth(): Promise<void> {
        await this._cliAuthReadyPromise;
    }

    /**
     * Sign out and clear the persisted session
     */
    async signOut(): Promise<void> {
        await signOut(this._config.auth);
        this._currentUser = null;
    }

    /**
     * Sign in with a Firebase Auth Credential
     */
    async signInWithCredential(credential: AuthCredential): Promise<User> {
        const result = await signInWithCredential(
            this._config.auth,
            credential,
        );
        this._currentUser = result.user;
        return result.user;
    }

    /**
     * Get the current authenticated user
     */
    get user(): User | null {
        return this._currentUser;
    }
}
