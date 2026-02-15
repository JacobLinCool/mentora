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
import {
	getFirestore,
	connectFirestoreEmulator,
	type Firestore,
	type Unsubscribe
} from 'firebase/firestore';
import { Firestore as ServerFirestore } from 'fires2rest';
import { MentoraClient } from '../src/lib/api/client.js';
import { Wallets, type LedgerEntry } from 'mentora-firebase';

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
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5173/api';

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

export interface AssertEventuallyOptions<T> {
	timeoutMs?: number;
	intervalMs?: number;
	predicate?: (value: T) => boolean;
	message?: string;
}

/**
 * Retry an assertion-style operation until it succeeds or times out.
 */
export async function assertEventually<T>(
	fn: () => Promise<T>,
	options?: AssertEventuallyOptions<T>
): Promise<T> {
	const timeoutMs = options?.timeoutMs ?? 8_000;
	const intervalMs = options?.intervalMs ?? 100;
	const predicate = options?.predicate ?? (() => true);
	const deadline = Date.now() + timeoutMs;

	let lastError: unknown = null;
	let lastValue: T | null = null;

	while (Date.now() < deadline) {
		try {
			const value = await fn();
			lastValue = value;
			if (predicate(value)) {
				return value;
			}
			lastError = new Error('Predicate returned false');
		} catch (error) {
			lastError = error;
		}

		await delay(intervalMs);
	}

	if (lastError instanceof Error) {
		throw new Error(options?.message ?? `assertEventually timed out: ${lastError.message}`);
	}

	throw new Error(
		options?.message ??
			`assertEventually timed out${lastValue === null ? '' : ` (last value: ${JSON.stringify(lastValue)})`}`
	);
}

export interface WaitForSnapshotOptions {
	timeoutMs?: number;
}

/**
 * Convert callback-based subscriptions into a one-shot promise.
 */
export function waitForSnapshot<T>(
	subscribe: (
		onValue: (value: T) => void,
		onError: (error: unknown) => void
	) => Unsubscribe | (() => void),
	options?: WaitForSnapshotOptions
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeoutMs = options?.timeoutMs ?? 8_000;
		let settled = false;
		let unsubscribe: Unsubscribe | (() => void) | null = null;

		const timer = setTimeout(() => {
			if (!settled) {
				settled = true;
				try {
					unsubscribe?.();
				} finally {
					reject(new Error(`waitForSnapshot timed out after ${timeoutMs}ms`));
				}
			}
		}, timeoutMs);

		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				unsubscribe?.();
			} finally {
				fn();
			}
		};

		unsubscribe = subscribe(
			(value) => finish(() => resolve(value)),
			(error) => finish(() => reject(error))
		);
	});
}

export interface CourseFixtureOptions {
	visibility?: 'public' | 'unlisted' | 'private';
	joinStudent?: boolean;
}

export interface CourseFixtureResult {
	courseId: string;
	courseCode: string;
	studentJoined: boolean;
}

/**
 * Create a course fixture and optionally enroll the student client.
 */
export async function createCourseFixture(
	teacher: MentoraClient,
	student?: MentoraClient,
	options?: CourseFixtureOptions
): Promise<CourseFixtureResult> {
	const courseCode = `FX${Date.now().toString(36).toUpperCase().slice(-8)}`;
	const createResult = await teacher.courses.create(
		`Fixture Course ${generateTestId()}`,
		courseCode,
		{
			visibility: options?.visibility ?? 'private'
		}
	);
	if (!createResult.success) {
		throw new Error(`Failed to create course fixture: ${createResult.error}`);
	}

	let studentJoined = false;
	if (student && options?.joinStudent !== false) {
		const joinResult = await student.courses.joinByCode(courseCode);
		if (!joinResult.success) {
			throw new Error(`Failed to join course fixture: ${joinResult.error}`);
		}
		studentJoined = true;
	}

	return {
		courseId: createResult.data,
		courseCode,
		studentJoined
	};
}

export interface QuestionnaireFixtureOptions {
	topicId?: string | null;
	title?: string;
	startAt?: number;
	allowLate?: boolean;
	allowResubmit?: boolean;
}

/**
 * Create a questionnaire fixture with schema-valid default questions.
 */
export async function createQuestionnaireFixture(
	teacher: MentoraClient,
	courseId: string,
	options?: QuestionnaireFixtureOptions
): Promise<{ questionnaireId: string }> {
	const createResult = await teacher.questionnaires.create({
		courseId,
		topicId: options?.topicId ?? null,
		title: options?.title ?? `Fixture Questionnaire ${generateTestId()}`,
		questions: [
			{
				question: {
					type: 'single_answer_choice',
					questionText: 'How confident are you in this topic?',
					options: ['Low', 'Medium', 'High']
				},
				required: true
			},
			{
				question: {
					type: 'short_answer',
					questionText: 'What is your main learning goal?'
				},
				required: false
			}
		],
		startAt: options?.startAt ?? Date.now() - 1_000,
		dueAt: null,
		allowLate: options?.allowLate ?? true,
		allowResubmit: options?.allowResubmit ?? true
	});

	if (!createResult.success) {
		throw new Error(`Failed to create questionnaire fixture: ${createResult.error}`);
	}

	return { questionnaireId: createResult.data };
}

export interface HostLedgerSeed {
	id?: string;
	type?: LedgerEntry['type'];
	amountCredits: number;
	idempotencyKey?: string | null;
	paymentRef?: string | null;
	createdBy?: string | null;
	createdAt?: number;
}

/**
 * Seed a host wallet and optional ledger entries via server-side emulator access.
 */
export async function seedHostWalletWithLedger(
	courseId: string,
	entries: HostLedgerSeed[] = []
): Promise<{ walletId: string }> {
	const firestore = ServerFirestore.useEmulator();
	const walletId = `wallet_host_${courseId}`;
	const now = Date.now();

	await firestore.doc(Wallets.docPath(walletId)).set({
		ownerType: 'host',
		ownerId: courseId,
		balanceCredits: entries.reduce((sum, entry) => sum + entry.amountCredits, 0),
		createdAt: now,
		updatedAt: now
	});

	for (const [index, entry] of entries.entries()) {
		const entryId = entry.id ?? `entry_${index + 1}`;
		const createdAt = entry.createdAt ?? now + index;
		await firestore.doc(Wallets.entries.docPath(walletId, entryId)).set({
			type: entry.type ?? 'grant',
			amountCredits: entry.amountCredits,
			idempotencyKey: entry.idempotencyKey ?? null,
			scope: {
				courseId,
				topicId: null,
				assignmentId: null,
				conversationId: null
			},
			provider: {
				name: entry.paymentRef ? 'stripe' : 'manual',
				ref: entry.paymentRef ?? null
			},
			metadata: null,
			createdBy: entry.createdBy ?? null,
			createdAt
		});
	}

	return { walletId };
}

/**
 * Clear Firestore data via emulator REST API
 * Call this in beforeEach/afterEach to reset state
 */
export async function clearFirestoreEmulator(): Promise<void> {
	const endpoint = `http://${FIRESTORE_HOST}:${FIRESTORE_PORT}/emulator/v1/projects/demo-no-project/databases/(default)/documents`;
	const deadline = Date.now() + 20_000;
	let lastStatus: number | null = null;
	let lastStatusText = '';

	while (Date.now() < deadline) {
		const response = await fetch(endpoint, { method: 'DELETE' });
		if (response.ok) {
			return;
		}

		lastStatus = response.status;
		lastStatusText = response.statusText;
		// Emulator returns 409 while a previous flush is still in progress.
		if (response.status !== 409) {
			break;
		}

		await delay(250);
	}

	console.warn(
		`Failed to clear Firestore emulator: ${lastStatus ?? 'unknown'} ${lastStatusText}`.trim()
	);
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
