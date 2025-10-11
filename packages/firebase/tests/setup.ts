import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { setLogLevel } from "firebase/firestore";
import { readFileSync } from "fs";

// Suppress Firestore logs during tests
setLogLevel("error");

let testEnv: RulesTestEnvironment | undefined;

/**
 * Initialize test environment with security rules
 */
export async function setup(): Promise<RulesTestEnvironment> {
    if (testEnv) {
        return testEnv;
    }

    testEnv = await initializeTestEnvironment({
        projectId: "mentora-test",
        firestore: {
            rules: readFileSync("sync/firestore.rules", "utf8"),
            host: "127.0.0.1",
            port: 8080,
        },
    });

    return testEnv;
}

/**
 * Clean up test environment
 */
export async function teardown(): Promise<void> {
    if (testEnv) {
        await testEnv.cleanup();
        testEnv = undefined;
    }
}

/**
 * Clear all data between tests
 */
export async function clearFirestore(): Promise<void> {
    if (testEnv) {
        await testEnv.clearFirestore();
    }
}

export { assertFails, assertSucceeds };
