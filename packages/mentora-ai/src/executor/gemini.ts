import type { GenerateContentConfig, GoogleGenAI } from "@google/genai";
import type { JsonValue, Prompt, PromptExecutor } from "../types.js";

export class GeminiPromptExecutor implements PromptExecutor {
    constructor(
        private genai: GoogleGenAI,
        private model: string,
    ) {}

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
        };

        const response = await this.genai.models.generateContent({
            model: this.model,
            contents: prompt.contents,
            config,
        });

        const text = response.text;
        if (!text) {
            throw new Error("No text returned from Gemini model");
        }

        if (prompt.schema === null) {
            return text as O extends null ? string : O;
        } else {
            try {
                const parsed = JSON.parse(text);
                return parsed as O extends null ? string : O;
            } catch (error) {
                throw new Error(`Failed to parse JSON response: ${error}`);
            }
        }
    }
}
