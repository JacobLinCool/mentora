import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	test: {
		globals: true,
		environment: 'node',
		testTimeout: 30_000,
		hookTimeout: 30_000,

		// Run test files sequentially to avoid Firestore race conditions
		fileParallelism: false,

		// Global setup/teardown for emulators
		globalSetup: ['tests/globalSetup.ts'],

		// Run all tests in the tests directory
		include: ['tests/**/*.test.ts'],
		exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],

		// Setup file to run before tests
		setupFiles: ['tests/setup.ts'],

		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/lib/api/**/*.ts'],
			exclude: ['**/*.test.ts', '**/*.spec.ts']
		}
	}
});
