/**
 * Firebase Authentication for API Explorer
 *
 * Provides Google Sign-in for testing authenticated endpoints
 * without manually entering tokens.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
	getAuth,
	signInWithPopup,
	GoogleAuthProvider,
	signOut,
	onAuthStateChanged,
	type Auth,
	type User
} from 'firebase/auth';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_PROJECT_ID
} from '$env/static/public';

// Firebase config from environment variables
const firebaseConfig = {
	apiKey: PUBLIC_FIREBASE_API_KEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: PUBLIC_FIREBASE_PROJECT_ID,
	appId: PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Initialize Firebase (lazy, client-side only)
 */
function initFirebase(): Auth {
	if (auth) return auth;

	const existingApps = getApps();
	app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
	auth = getAuth(app);

	return auth;
}

/**
 * Auth state store for reactive updates
 */
export interface AuthState {
	user: User | null;
	token: string | null;
	loading: boolean;
	error: string | null;
}

type AuthSubscriber = (state: AuthState) => void;

let authState: AuthState = {
	user: null,
	token: null,
	loading: true,
	error: null
};

const subscribers = new Set<AuthSubscriber>();

function notifySubscribers() {
	subscribers.forEach((fn) => fn(authState));
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuth(callback: AuthSubscriber): () => void {
	subscribers.add(callback);
	callback(authState); // Immediate callback with current state

	// Initialize Firebase auth listener on first subscriber
	if (subscribers.size === 1) {
		initializeAuthListener();
	}

	return () => {
		subscribers.delete(callback);
	};
}

let authListenerInitialized = false;

function initializeAuthListener() {
	if (authListenerInitialized) return;
	authListenerInitialized = true;

	try {
		const auth = initFirebase();
		onAuthStateChanged(auth, async (user) => {
			if (user) {
				try {
					const token = await user.getIdToken();
					authState = { user, token, loading: false, error: null };
				} catch {
					authState = {
						user,
						token: null,
						loading: false,
						error: 'Failed to get token'
					};
				}
			} else {
				authState = { user: null, token: null, loading: false, error: null };
			}
			notifySubscribers();
		});
	} catch (err) {
		authState = {
			user: null,
			token: null,
			loading: false,
			error: err instanceof Error ? err.message : 'Firebase init failed'
		};
		notifySubscribers();
	}
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<void> {
	try {
		authState = { ...authState, loading: true, error: null };
		notifySubscribers();

		const auth = initFirebase();
		const provider = new GoogleAuthProvider();
		await signInWithPopup(auth, provider);
		// Auth state listener will update the state
	} catch (err) {
		authState = {
			...authState,
			loading: false,
			error: err instanceof Error ? err.message : 'Sign in failed'
		};
		notifySubscribers();
		throw err;
	}
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
	try {
		const auth = initFirebase();
		await signOut(auth);
		// Auth state listener will update the state
	} catch (err) {
		authState = {
			...authState,
			error: err instanceof Error ? err.message : 'Sign out failed'
		};
		notifySubscribers();
		throw err;
	}
}

/**
 * Get current auth state (synchronous)
 */
export function getAuthState(): AuthState {
	return authState;
}

/**
 * Refresh the ID token
 */
export async function refreshToken(): Promise<string | null> {
	if (!authState.user) return null;

	try {
		const token = await authState.user.getIdToken(true);
		authState = { ...authState, token };
		notifySubscribers();
		return token;
	} catch (err) {
		authState = {
			...authState,
			error: err instanceof Error ? err.message : 'Token refresh failed'
		};
		notifySubscribers();
		return null;
	}
}
