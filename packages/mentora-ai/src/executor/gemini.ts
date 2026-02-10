import type { GenerateContentConfig, GoogleGenAI } from "@google/genai";
import type { JsonValue, Prompt, PromptExecutor } from "../types.js";
import { BaseTokenTracker } from "./token-tracker.js";

export class GeminiPromptExecutor
    extends BaseTokenTracker
    implements PromptExecutor
{
    constructor(
        private genai: GoogleGenAI,
        private model: string,
    ) {
        super();
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

        return this.executeWithRetry(async () => {
            const response = await this.genai.models.generateContent({
                model: this.model,
                contents: prompt.contents,
                config,
            });

            // Accumulate token usage for current turn from Gemini API
            this.accumulateUsage(response.usageMetadata);

            const text = response.text;
            if (!text?.trim()) {
                throw new Error("Empty response from model");
            }

            if (!withStructuredOutput) {
                return text as O extends null ? string : O;
            }

            const parsed = JSON.parse(text);
            const result = prompt.schema?.safeParse(parsed);

            if (!result?.success) {
                throw new Error(
                    `Schema validation failed: ${result?.error?.issues?.[0]?.message || "unknown error"}`,
                );
            }

            return result.data as O extends null ? string : O;
        }, "Prompt execution");
    }
}
