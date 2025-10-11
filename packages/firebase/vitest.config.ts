import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        testTimeout: 60_000,
        hookTimeout: 60_000,
        teardownTimeout: 15_000,
        setupFiles: [],
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["sync/firestore.rules"],
        },
        fileParallelism: false,
    },
});
