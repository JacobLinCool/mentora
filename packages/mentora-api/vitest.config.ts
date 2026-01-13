import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		testTimeout: 60_000, // 60s for network operations
		hookTimeout: 60_000,
		teardownTimeout: 30_000,
		include: ['tests/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/lib/api/**/*.ts'],
			exclude: ['src/lib/api/**/*.svelte.ts']
		},
		fileParallelism: false, // Run tests sequentially for shared state
		pool: 'forks', // Use forks for better isolation
		setupFiles: ['tests/emulator-vitest-setup.ts']
	}
});
