import path from "node:path";
import type { UserConfig } from "vitest/config";

export const vitestEnvResolve: UserConfig["resolve"] = {
    alias: [
        {
            find: "$env/dynamic/private",
            replacement: path.resolve(__dirname, "./tests/stub/env/private.ts"),
        },
    ],
};
