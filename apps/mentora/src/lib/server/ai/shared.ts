import { env } from "$env/dynamic/private";
import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

const google = new OpenAI({
    apiKey: env.GEMINI_API_KEY,
    baseURL:
        env.GEMINI_API_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const ai = {
    google,
};

export function parseStructuredOutput<T>(
    content: string,
    format: z.ZodType<T>,
    context: string,
): T {
    let payload: unknown;
    try {
        payload = JSON.parse(content);
    } catch {
        throw new Error(`Failed to parse ${context} JSON payload`);
    }

    const parsed = format.safeParse(payload);
    if (!parsed.success) {
        throw new Error(`Failed to parse ${context} result`);
    }

    return parsed.data;
}

export { z, zodResponseFormat };
