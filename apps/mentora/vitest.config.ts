import { defineConfig } from "vitest/config";
import { vitestEnvResolve } from "./vitest.shared";

export default defineConfig({
    resolve: vitestEnvResolve,
    test: {
        include: ["tests/**/*.test.ts"],
        exclude: ["tests/**/*.integration.test.*"],
    },
});
