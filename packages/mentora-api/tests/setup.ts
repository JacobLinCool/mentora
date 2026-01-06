/**
 * Integration Test Setup for mentora-api
 *
 * This provides utilities for testing all mentora-api interfaces with:
 * 1. Firebase Emulator (for Firestore/Auth)
 * 2. SvelteKit dev server (for backend API endpoints)
 *
 * Prerequisites:
 * - Firebase Emulator running: `pnpm --filter firebase test:emulator`
 * - SvelteKit dev server running: `pnpm --filter mentora dev`
 */

import type { MentoraAPIConfig } from '$lib/api/types';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// Emulator configuration
export const EMULATOR_CONFIG = {
	projectId: 'mentora-test',
	auth: { host: '127.0.0.1', port: 9099 },
	firestore: { host: '127.0.0.1', port: 8080 }
};

// Backend URL (SvelteKit dev server)
export const BACKEND_BASE_URL = process.env.TEST_BACKEND_URL || 'http://localhost:5173';

// Test state
let testDb: Firestore | null = null;
let testUsers: Map<string, { uid: string; email: string; token: string }> = new Map();

/**
 * Initialize Firebase for testing with Emulator
 */
export async function initializeTestFirebase(): Promise<Firestore> {
	if (testDb) return testDb;

	const { initializeApp } = await import('firebase/app');
	const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
	const { getAuth, connectAuthEmulator } = await import('firebase/auth');

	const app = initializeApp({
		apiKey: 'fake-api-key',
		projectId: EMULATOR_CONFIG.projectId
	});

	const db = getFirestore(app);
	connectFirestoreEmulator(db, EMULATOR_CONFIG.firestore.host, EMULATOR_CONFIG.firestore.port);

	const auth = getAuth(app);
	connectAuthEmulator(auth, `http://${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}`);

	testDb = db;
	return db;
}

/**
 * Create a test user in Firebase Auth Emulator
 */
/**
 * Create a test user in Firebase Auth Emulator
 */
export async function createTestUser(options?: {
	email?: string;
	displayName?: string;
}): Promise<{ uid: string; email: string; token: string }> {
	const email = options?.email || `test-${Date.now()}@example.com`;
	const displayName = options?.displayName || 'Test User';

	// Check cache first
	if (testUsers.has(email)) {
		console.log('[DEBUG] Using cached user:', testUsers.get(email)!.uid);
		return testUsers.get(email)!;
	}

	const authUrl = `http://${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}`;
	console.log('[DEBUG] Connecting to Auth Emulator at:', authUrl);

	// Try sign up
	let response = await fetch(
		`${authUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email,
				password: 'test-password-123',
				displayName,
				returnSecureToken: true
			})
		}
	);

	if (!response.ok) {
		// User exists, sign in instead
		response = await fetch(
			`${authUrl}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password: 'test-password-123',
					returnSecureToken: true
				})
			}
		);
	}

	if (!response.ok) {
		throw new Error(`Failed to create/sign in test user: ${await response.text()}`);
	}

	const data = await response.json();
	console.log('[DEBUG] Created/Found Test User (REST):', data.localId, email);

	const user = {
		uid: data.localId,
		email,
		token: data.idToken
	};

	testUsers.set(email, user);
	return user;
}

/**
 * Create a mock MentoraAPIConfig for testing
 */
export async function createTestConfig(options?: {
	authenticated?: boolean;
	email?: string;
}): Promise<MentoraAPIConfig> {
	const db = await initializeTestFirebase();
	const authenticated = options?.authenticated ?? true;

	const { getAuth } = await import('firebase/auth');
	const { initializeApp } = await import('firebase/app');

	// Get or create the app
	let app;
	try {
		const { getApp } = await import('firebase/app');
		app = getApp();
	} catch {
		app = initializeApp({
			apiKey: 'fake-api-key',
			projectId: EMULATOR_CONFIG.projectId
		});
	}

	const auth = getAuth(app);

	let currentUser: User | null = null;

	if (authenticated) {
		const testUser = await createTestUser({ email: options?.email });

		// Actually sign in to the client SDK so Firestore rules work
		const { signInWithEmailAndPassword } = await import('firebase/auth');
		const result = await signInWithEmailAndPassword(auth, testUser.email, 'test-password-123');

		console.log('[DEBUG] Signed in (Client SDK):', result.user.uid, result.user.email);

		if (result.user.uid !== testUser.uid) {
			console.error(
				'[CRITICAL ERROR] Client SDK UID does not match REST API UID!',
				result.user.uid,
				testUser.uid
			);
		}

		currentUser = result.user;
	}

	return {
		environment: { browser: false },
		auth,
		db,
		backendBaseUrl: BACKEND_BASE_URL,
		getCurrentUser: () => currentUser
	};
}

/**
 * Clear Firestore data between tests
 */
export async function clearFirestore(): Promise<void> {
	const emulatorUrl = `http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`;

	try {
		await fetch(
			`${emulatorUrl}/emulator/v1/projects/${EMULATOR_CONFIG.projectId}/databases/(default)/documents`,
			{ method: 'DELETE' }
		);
	} catch (err) {
		console.warn('Failed to clear Firestore:', err);
	}
}

/**
 * Wait for the backend server to be ready
 */
export async function waitForBackend(timeout: number = 30000): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		try {
			const response = await fetch(BACKEND_BASE_URL);
			if (response.ok || response.status < 500) {
				return;
			}
		} catch {
			// Server not ready yet
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`Backend at ${BACKEND_BASE_URL} not ready within ${timeout}ms`);
}

/**
 * Wait for Firebase Emulator to be ready
 */
export async function waitForEmulator(timeout: number = 30000): Promise<void> {
	const startTime = Date.now();
	const emulatorUrl = `http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`;

	while (Date.now() - startTime < timeout) {
		try {
			const response = await fetch(emulatorUrl);
			if (response.ok || response.status < 500) {
				return;
			}
		} catch {
			// Emulator not ready yet
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`Firebase Emulator not ready within ${timeout}ms`);
}

/**
 * Setup for all integration tests
 */
export async function setupIntegrationTests(): Promise<void> {
	await waitForEmulator();
	await waitForBackend();
	await initializeTestFirebase();
}

/**
 * Cleanup after tests
 */
export async function teardownIntegrationTests(): Promise<void> {
	testUsers.clear();
	testDb = null;
}
