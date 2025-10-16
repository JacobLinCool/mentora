import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: [
            {
                find: "$env/dynamic/private",
                replacement: path.resolve(
                    __dirname,
                    "./tests/stub/env/private.ts",
                ),
            },
        ],
    },
});
