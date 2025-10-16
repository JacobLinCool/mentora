import { env } from "$env/dynamic/private";
import type { OpenAI } from "openai";
import { ai, z, zodResponseFormat } from "./shared";

const MENTORA_AI_CHAT_MODEL = env.MENTORA_AI_CHAT_MODEL || "openai/gpt-5-nano";

export async function chat<T>(
    body: Omit<
        OpenAI.ChatCompletionCreateParamsNonStreaming,
        "model" | "response_format"
    >,
    format: z.ZodType<T>,
): Promise<T> {
    const response = await ai.openai.chat.completions.create({
        model: MENTORA_AI_CHAT_MODEL,
        response_format: zodResponseFormat(format, "result"),
        ...body,
    });

    const message = response.choices[0]?.message;
    if (message.refusal) {
        throw new Error(`Transcription refused: ${message.refusal}`);
    }

    if (!message.content) {
        throw new Error("No transcription content received");
    }

    const parsed = format.safeParse(JSON.parse(message.content));
    if (!parsed.success) {
        throw new Error("Failed to parse transcription result");
    }

    return parsed.data;
}
