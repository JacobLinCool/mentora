import type { TokenUsage } from "../types.js";

/**
 * Base class for components that track token usage
 * Provides common token tracking implementation for all executors
 */
export abstract class BaseTokenTracker {
    protected currentTurnUsage: TokenUsage = this.createEmptyUsage();
    protected maxRetries = 3;

    /**
     * Get the token usage for the current turn
     */
    getTokenUsage(): TokenUsage {
        return { ...this.currentTurnUsage };
    }

    /**
     * Reset the token usage counter for a new turn
     */
    resetTokenUsage(): void {
        this.currentTurnUsage = this.createEmptyUsage();
    }

    /**
     * Update token usage by accumulating values from usage metadata
     * @param usage - Usage metadata from Gemini API response
     */
    protected accumulateUsage(usage: TokenUsage | undefined): void {
        if (!usage) return;

        this.currentTurnUsage.cachedContentTokenCount =
            (this.currentTurnUsage.cachedContentTokenCount ?? 0) +
            (usage.cachedContentTokenCount ?? 0);
        this.currentTurnUsage.candidatesTokenCount =
            (this.currentTurnUsage.candidatesTokenCount ?? 0) +
            (usage.candidatesTokenCount ?? 0);
        this.currentTurnUsage.promptTokenCount =
            (this.currentTurnUsage.promptTokenCount ?? 0) +
            (usage.promptTokenCount ?? 0);
        this.currentTurnUsage.thoughtsTokenCount =
            (this.currentTurnUsage.thoughtsTokenCount ?? 0) +
            (usage.thoughtsTokenCount ?? 0);
        this.currentTurnUsage.toolUsePromptTokenCount =
            (this.currentTurnUsage.toolUsePromptTokenCount ?? 0) +
            (usage.toolUsePromptTokenCount ?? 0);
        this.currentTurnUsage.totalTokenCount =
            (this.currentTurnUsage.totalTokenCount ?? 0) +
            (usage.totalTokenCount ?? 0);
    }

    /**
     * Execute an async function with retry logic
     * @param fn - The async function to execute
     * @param errorMessage - Custom error message prefix
     * @returns The result of the function
     */
    protected async executeWithRetry<T>(
        fn: () => Promise<T>,
        errorMessage: string = "Operation",
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                // If it's the last attempt, don't wait
                if (attempt < this.maxRetries) {
                    // Exponential backoff: 100ms, 200ms, 400ms...
                    await new Promise((resolve) =>
                        setTimeout(resolve, 100 * Math.pow(2, attempt - 1)),
                    );
                }
            }
        }

        throw new Error(
            `${errorMessage} failed after ${this.maxRetries} attempts: ${lastError?.message}`,
        );
    }

    private createEmptyUsage(): TokenUsage {
        return {
            cachedContentTokenCount: 0,
            candidatesTokenCount: 0,
            promptTokenCount: 0,
            thoughtsTokenCount: 0,
            toolUsePromptTokenCount: 0,
            totalTokenCount: 0,
        };
    }
}
