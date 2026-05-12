import type { GenerateContentConfig, GoogleGenAI } from "@google/genai";
import { NoopObserver, type LLMSpan } from "../observability/observer.js";
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
        parent?: LLMSpan,
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

        const observer = parent ?? NoopObserver.startSpan("prompt");

        return this.executeWithRetry(async () => {
            const generation = observer.generation("gemini.generateContent", {
                model: this.model,
                input: {
                    systemInstruction: prompt.systemInstruction,
                    contents: prompt.contents,
                    structured: withStructuredOutput,
                },
            });

            let usage: typeof response.usageMetadata | undefined;
            let response: Awaited<
                ReturnType<typeof this.genai.models.generateContent>
            >;
            try {
                response = await this.genai.models.generateContent({
                    model: this.model,
                    contents: prompt.contents,
                    config,
                });
                usage = response.usageMetadata;

                // Accumulate token usage for current turn from Gemini API
                this.accumulateUsage(usage);

                const text = response.text;
                if (!text?.trim()) {
                    throw new Error("Empty response from model");
                }

                if (!withStructuredOutput) {
                    generation.end({
                        output: text,
                        usage,
                        model: this.model,
                    });
                    return text as O extends null ? string : O;
                }

                const parsed = JSON.parse(text);
                const result = prompt.schema?.safeParse(parsed);

                if (!result?.success) {
                    throw new Error(
                        `Schema validation failed: ${result?.error?.issues?.[0]?.message || "unknown error"}`,
                    );
                }

                generation.end({
                    output: result.data,
                    usage,
                    model: this.model,
                });
                return result.data as O extends null ? string : O;
            } catch (error) {
                generation.end({ error, usage, model: this.model });
                throw error;
            }
        }, "Prompt execution");
    }
}
