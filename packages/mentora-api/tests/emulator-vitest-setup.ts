/**
 * Vitest setup file for emulator tests
 * Configures the test environment to use Firebase emulators
 */

import { beforeAll, afterAll } from 'vitest';
import { clearFirestoreEmulator, teardownAllClients } from './emulator-setup.js';

// Clean up Firestore before all tests to start fresh
beforeAll(async () => {
	await clearFirestoreEmulator();
});

// Clean up after all tests
afterAll(async () => {
	await teardownAllClients();
});

// Log that we're using emulators
beforeAll(() => {
	console.log('🔥 Running tests with Firebase Emulators');
	console.log('   Firestore: 127.0.0.1:8080');
	console.log('   Auth: 127.0.0.1:9099');
});
