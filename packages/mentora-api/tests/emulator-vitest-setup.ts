/**
 * Vitest setup file for emulator tests
 * Configures the test environment to use Firebase emulators
 */

import { beforeAll, afterAll } from 'vitest';
import { BACKEND_URL } from './emulator-setup.js';
import { clearFirestoreEmulator, teardownAllClients } from './emulator-setup.js';

const backendBase = new URL(BACKEND_URL);
const backendBasePath = backendBase.pathname.replace(/\/+$/, '');
const originalFetch = globalThis.fetch.bind(globalThis);

let backendHandlerPromise: Promise<{
	handle: (path: string, request: Request) => Promise<Response>;
}> | null = null;

async function getBackendHandler() {
	if (!backendHandlerPromise) {
		backendHandlerPromise = (async () => {
			const [{ createServerHandler }, { Firestore }] = await Promise.all([
				import('../src/lib/server/index.js'),
				import('fires2rest')
			]);

			return createServerHandler({
				firestore: Firestore.useEmulator(),
				projectId: 'demo-no-project',
				useEmulator: true
			});
		})();
	}

	return backendHandlerPromise;
}

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
	const request =
		input instanceof Request ? (init ? new Request(input, init) : input) : new Request(input, init);

	const url = new URL(request.url);
	const matchesBackend =
		url.origin === backendBase.origin &&
		(url.pathname === backendBasePath || url.pathname.startsWith(`${backendBasePath}/`));

	if (!matchesBackend) {
		return originalFetch(input, init);
	}

	let routePath = url.pathname.slice(backendBasePath.length);
	if (!routePath.startsWith('/')) {
		routePath = `/${routePath}`;
	}
	if (routePath === '') {
		routePath = '/';
	}

	const handler = await getBackendHandler();
	return handler.handle(routePath, request);
}) as typeof fetch;

// Clean up Firestore before all tests to start fresh
beforeAll(async () => {
	await clearFirestoreEmulator();
});

// Clean up after all tests
afterAll(async () => {
	await teardownAllClients();
	globalThis.fetch = originalFetch;
});

// Log that we're using emulators
beforeAll(() => {
	console.log('🔥 Running tests with Firebase Emulators');
	console.log('   Firestore: 127.0.0.1:8080');
	console.log('   Auth: 127.0.0.1:9099');
});
