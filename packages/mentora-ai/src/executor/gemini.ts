import type { GenerateContentConfig, GoogleGenAI } from "@google/genai";
import type {
    JsonValue,
    Prompt,
    PromptExecutor,
    TokenUsage,
} from "../types.js";

export class GeminiPromptExecutor implements PromptExecutor {
    private currentTurnUsage: TokenUsage = {
        cachedContentTokenCount: 0,
        candidatesTokenCount: 0,
        promptTokenCount: 0,
        thoughtsTokenCount: 0,
        toolUsePromptTokenCount: 0,
        totalTokenCount: 0,
    };

    constructor(
        private genai: GoogleGenAI,
        private model: string,
    ) {}

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
        this.currentTurnUsage = {
            cachedContentTokenCount: 0,
            candidatesTokenCount: 0,
            promptTokenCount: 0,
            thoughtsTokenCount: 0,
            toolUsePromptTokenCount: 0,
            totalTokenCount: 0,
        };
    }

    /**
     * Execute a prompt and return the response
     * Token usage is accumulated in currentTurnUsage
     */
    async execute<O extends Record<string, JsonValue> | null>(
        prompt: Prompt<O>,
    ): Promise<O extends null ? string : O> {
        const withStructuredOutput = prompt.schema !== null;

        const config: GenerateContentConfig = {
            responseMimeType: withStructuredOutput
                ? "application/json"
                : "text/plain",
            responseJsonSchema: withStructuredOutput
                ? prompt.schema?.toJSONSchema()
                : undefined,
            systemInstruction: prompt.systemInstruction,
        };

        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(
                        `[GeminiExecutor] Retry ${attempt}/${maxRetries}`,
                    );
                }

                console.log(
                    "[GeminiExecutor] Sending prompt with config:",
                    JSON.stringify(config, null, 2),
                );
                console.log(
                    "[GeminiExecutor] Prompt contents:",
                    JSON.stringify(prompt.contents, null, 2),
                );
                const response = await this.genai.models.generateContent({
                    model: this.model,
                    contents: prompt.contents,
                    config,
                });
                console.log(
                    "[GeminiExecutor] Raw response:",
                    JSON.stringify(response, null, 2),
                );

                // Accumulate token usage for current turn from Gemini API
                const usage = response.usageMetadata;
                this.currentTurnUsage.cachedContentTokenCount =
                    (this.currentTurnUsage.cachedContentTokenCount ?? 0) +
                    (usage?.cachedContentTokenCount ?? 0);
                this.currentTurnUsage.candidatesTokenCount =
                    (this.currentTurnUsage.candidatesTokenCount ?? 0) +
                    (usage?.candidatesTokenCount ?? 0);
                this.currentTurnUsage.promptTokenCount =
                    (this.currentTurnUsage.promptTokenCount ?? 0) +
                    (usage?.promptTokenCount ?? 0);
                this.currentTurnUsage.thoughtsTokenCount =
                    (this.currentTurnUsage.thoughtsTokenCount ?? 0) +
                    (usage?.thoughtsTokenCount ?? 0);
                this.currentTurnUsage.toolUsePromptTokenCount =
                    (this.currentTurnUsage.toolUsePromptTokenCount ?? 0) +
                    (usage?.toolUsePromptTokenCount ?? 0);
                this.currentTurnUsage.totalTokenCount =
                    (this.currentTurnUsage.totalTokenCount ?? 0) +
                    (usage?.totalTokenCount ?? 0);

                const text = response.text;
                if (!text?.trim()) {
                    throw new Error("Empty response from model");
                }

                if (!withStructuredOutput) {
                    return text as O extends null ? string : O;
                }

                const parsed = JSON.parse(text);
                console.log(
                    "[GeminiExecutor] Parsed response:",
                    JSON.stringify(parsed, null, 2),
                );
                const result = prompt.schema?.safeParse(parsed);

                if (!result?.success) {
                    console.error(
                        "[GeminiExecutor] Schema validation failed:",
                        result?.error?.issues,
                    );
                    console.error(
                        "[GeminiExecutor] Received:",
                        JSON.stringify(parsed, null, 2),
                    );
                    throw new Error(
                        `Schema validation failed: ${result?.error?.issues?.[0]?.message || "unknown error"}`,
                    );
                }

                return result.data as O extends null ? string : O;
            } catch (error) {
                lastError = error as Error;
            }
        }

        throw new Error(
            `Failed after ${maxRetries} attempts: ${lastError?.message}`,
        );
    }
}
