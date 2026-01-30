/**
 * Test setup file
 * Provides executor and utilities for integration tests
 */
import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { GeminiPromptExecutor } from "../src/executor/gemini.js";

config();

/**
 * Create a shared executor instance for integration tests
 * Uses TEST_MODEL environment variable
 */
export function createTestExecutor(): GeminiPromptExecutor {
    const model = process.env.TEST_MODEL || "gemini-2.5-flash-lite";

    const genai = new GoogleGenAI({});
    return new GeminiPromptExecutor(genai, model);
}

/**
 * Check if integration tests should run
 * Returns false if TEST_MODEL is not available
 */
export function shouldRunIntegrationTests(): boolean {
    return !!process.env.TEST_MODEL;
}

/**
 * Skip integration test helper
 */
export function skipIfNoTestModel(
    fn: () => void | Promise<void>,
): () => void | Promise<void> {
    return async () => {
        if (!shouldRunIntegrationTests()) {
            console.log("Skipping: TEST_MODEL not set");
            return;
        }
        await fn();
    };
}
