/**
 * Emulator Test Setup for Mentora API Integration Tests
 *
 * Provides test infrastructure using Firebase emulators (Auth + Firestore)
 * instead of production Firebase. No real accounts needed - users are created
 * programmatically in the Auth emulator.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
	getAuth,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	connectAuthEmulator,
	type Auth,
	type User
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { MentoraClient } from '../src/lib/api/client.js';

// Emulator configuration
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const AUTH_HOST = 'http://127.0.0.1:9099';

// Firebase configuration for emulator (project ID must match emulator)
const firebaseConfig = {
	apiKey: 'demo-api-key',
	authDomain: 'demo-no-project.firebaseapp.com',
	projectId: 'demo-no-project'
};

// Backend URL (use dev server by default)
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5173';

// Firebase app instances for each role
let teacherApp: FirebaseApp | null = null;
let studentApp: FirebaseApp | null = null;

// Current users
let teacherUser: User | null = null;
let studentUser: User | null = null;

// Clients
let teacherClient: MentoraClient | null = null;
let studentClient: MentoraClient | null = null;

// Test user credentials (created in emulator)
const TEACHER_EMAIL = 'teacher@test.local';
const TEACHER_PASSWORD = 'testpassword123';
const STUDENT_EMAIL = 'student@test.local';
const STUDENT_PASSWORD = 'testpassword123';

/**
 * Initialize Firebase app for teacher with emulator connection
 */
export function initTeacherFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
	if (!teacherApp) {
		const existingApps = getApps();
		const existing = existingApps.find((app) => app.name === 'teacher-emulator');
		if (existing) {
			teacherApp = existing;
		} else {
			teacherApp = initializeApp(firebaseConfig, 'teacher-emulator');
		}
		// Connect to emulators for this new app
		const auth = getAuth(teacherApp);
		const db = getFirestore(teacherApp);
		connectAuthEmulator(auth, AUTH_HOST, { disableWarnings: true });
		connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);
	}
	const auth = getAuth(teacherApp);
	const db = getFirestore(teacherApp);

	return { app: teacherApp, auth, db };
}

/**
 * Initialize Firebase app for student with emulator connection
 */
function initStudentFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
	if (!studentApp) {
		const existingApps = getApps();
		const existing = existingApps.find((app) => app.name === 'student-emulator');
		if (existing) {
			studentApp = existing;
		} else {
			studentApp = initializeApp(firebaseConfig, 'student-emulator');
		}
		// Connect to emulators for this new app
		const auth = getAuth(studentApp);
		const db = getFirestore(studentApp);
		connectAuthEmulator(auth, AUTH_HOST, { disableWarnings: true });
		connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);
	}
	const auth = getAuth(studentApp);
	const db = getFirestore(studentApp);

	return { app: studentApp, auth, db };
}

/**
 * Create or sign in as a user in the Auth emulator
 */
async function createOrSignIn(auth: Auth, email: string, password: string): Promise<User> {
	try {
		const credential = await signInWithEmailAndPassword(auth, email, password);
		return credential.user;
	} catch {
		// User doesn't exist, create them
		const credential = await createUserWithEmailAndPassword(auth, email, password);
		return credential.user;
	}
}

/**
 * Sign in as Teacher (creates user if needed)
 */
export async function signInAsTeacher(): Promise<User> {
	const { auth } = initTeacherFirebase();
	teacherUser = await createOrSignIn(auth, TEACHER_EMAIL, TEACHER_PASSWORD);
	return teacherUser;
}

/**
 * Sign in as Student (creates user if needed)
 */
export async function signInAsStudent(): Promise<User> {
	const { auth } = initStudentFirebase();
	studentUser = await createOrSignIn(auth, STUDENT_EMAIL, STUDENT_PASSWORD);
	return studentUser;
}

/**
 * Sign out Teacher
 */
export async function signOutTeacher(): Promise<void> {
	if (teacherApp) {
		const auth = getAuth(teacherApp);
		await signOut(auth);
	}
	teacherUser = null;
	teacherClient = null;
}

/**
 * Sign out Student
 */
export async function signOutStudent(): Promise<void> {
	if (studentApp) {
		const auth = getAuth(studentApp);
		await signOut(auth);
	}
	studentUser = null;
	studentClient = null;
}

/**
 * Get Teacher user
 */
export function getTeacherUser(): User | null {
	return teacherUser;
}

/**
 * Get Student user
 */
export function getStudentUser(): User | null {
	return studentUser;
}

/**
 * Create Teacher client
 */
export function createTeacherClient(): MentoraClient {
	const { auth, db } = initTeacherFirebase();
	return new MentoraClient({
		auth,
		db,
		backendBaseUrl: BACKEND_URL,
		environment: { browser: false }
	});
}

/**
 * Create Student client
 */
export function createStudentClient(): MentoraClient {
	const { auth, db } = initStudentFirebase();
	return new MentoraClient({
		auth,
		db,
		backendBaseUrl: BACKEND_URL,
		environment: { browser: false }
	});
}

/**
 * Get Teacher client (singleton)
 */
export function getTeacherClient(): MentoraClient {
	if (!teacherClient) {
		teacherClient = createTeacherClient();
	}
	return teacherClient;
}

/**
 * Get Student client (singleton)
 */
export function getStudentClient(): MentoraClient {
	if (!studentClient) {
		studentClient = createStudentClient();
	}
	return studentClient;
}

/**
 * Setup Teacher for tests
 */
export async function setupTeacherClient(): Promise<MentoraClient> {
	await signInAsTeacher();
	const client = getTeacherClient();
	await client.authReady;
	return client;
}

/**
 * Setup Student for tests
 */
export async function setupStudentClient(): Promise<MentoraClient> {
	await signInAsStudent();
	const client = getStudentClient();
	await client.authReady;
	return client;
}

/**
 * Setup both Teacher and Student
 */
export async function setupBothClients(): Promise<{
	teacher: MentoraClient;
	student: MentoraClient;
}> {
	const [teacher, student] = await Promise.all([setupTeacherClient(), setupStudentClient()]);
	return { teacher, student };
}

/**
 * Teardown all clients
 */
export async function teardownAllClients(): Promise<void> {
	await Promise.all([signOutTeacher(), signOutStudent()]);
}

// ============ Utilities ============

/**
 * Generate a unique test ID for isolating test data
 */
export function generateTestId(): string {
	return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for a short delay (useful for eventual consistency)
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clear Firestore data via emulator REST API
 * Call this in beforeEach/afterEach to reset state
 */
export async function clearFirestoreEmulator(): Promise<void> {
	const response = await fetch(
		`http://${FIRESTORE_HOST}:${FIRESTORE_PORT}/emulator/v1/projects/demo-no-project/databases/(default)/documents`,
		{ method: 'DELETE' }
	);
	if (!response.ok) {
		console.warn('Failed to clear Firestore emulator:', response.statusText);
	}
}

// ============ Dynamic Multi-User Support ============
// For tests requiring more than just Teacher/Student

const dynamicApps = new Map<string, FirebaseApp>();
const dynamicUsers = new Map<string, User>();
const dynamicClients = new Map<string, MentoraClient>();

/**
 * Initialize a Firebase app for a dynamic user
 */
function initDynamicFirebase(userId: string): { app: FirebaseApp; auth: Auth; db: Firestore } {
	let app = dynamicApps.get(userId);
	if (!app) {
		const existingApps = getApps();
		const existing = existingApps.find((a) => a.name === `dynamic-${userId}`);
		if (existing) {
			app = existing;
		} else {
			app = initializeApp(firebaseConfig, `dynamic-${userId}`);
			// Connect to emulators for this new app
			const auth = getAuth(app);
			const db = getFirestore(app);
			connectAuthEmulator(auth, AUTH_HOST, { disableWarnings: true });
			connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);
		}
		dynamicApps.set(userId, app);
	}
	const auth = getAuth(app);
	const db = getFirestore(app);

	return { app, auth, db };
}

/**
 * Create a test user in the Auth emulator with a unique email
 *
 * @param name - A friendly name for the user (used to generate email)
 * @returns The created User and their MentoraClient
 *
 * @example
 * // Create multiple students for a test
 * const { user: alice, client: aliceClient } = await createTestUser('alice');
 * const { user: bob, client: bobClient } = await createTestUser('bob');
 * const { user: charlie, client: charlieClient } = await createTestUser('charlie');
 */
export async function createTestUser(name: string): Promise<{ user: User; client: MentoraClient }> {
	const email = `${name.toLowerCase().replace(/\s+/g, '-')}@test.local`;
	const password = 'testpassword123';

	const { auth, db } = initDynamicFirebase(name);

	let user: User;
	try {
		const credential = await signInWithEmailAndPassword(auth, email, password);
		user = credential.user;
	} catch {
		const credential = await createUserWithEmailAndPassword(auth, email, password);
		user = credential.user;
	}

	dynamicUsers.set(name, user);

	const client = new MentoraClient({
		auth,
		db,
		backendBaseUrl: BACKEND_URL,
		environment: { browser: false }
	});

	dynamicClients.set(name, client);
	await client.authReady;

	return { user, client };
}

/**
 * Get a previously created test user's client
 */
export function getTestUserClient(name: string): MentoraClient | undefined {
	return dynamicClients.get(name);
}

/**
 * Get a previously created test user
 */
export function getTestUser(name: string): User | undefined {
	return dynamicUsers.get(name);
}

/**
 * Sign out and clean up a dynamic test user
 */
export async function signOutTestUser(name: string): Promise<void> {
	const app = dynamicApps.get(name);
	if (app) {
		const auth = getAuth(app);
		await signOut(auth);
	}
	dynamicUsers.delete(name);
	dynamicClients.delete(name);
}

/**
 * Create multiple test users at once
 *
 * @example
 * const users = await createTestUsers(['alice', 'bob', 'charlie']);
 * // users.alice.client, users.bob.client, etc.
 */
export async function createTestUsers(
	names: string[]
): Promise<Record<string, { user: User; client: MentoraClient }>> {
	const results = await Promise.all(names.map((name) => createTestUser(name)));
	return Object.fromEntries(names.map((name, i) => [name, results[i]]));
}
