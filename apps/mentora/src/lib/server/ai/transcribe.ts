import { env } from "$env/dynamic/private";
import { Buffer } from "node:buffer";
import { ai, parseStructuredOutput, z, zodResponseFormat } from "./shared";

const MENTORA_AI_TRANSCRIBE_MODEL =
    env.MENTORA_AI_TRANSCRIBE_MODEL || "google-ai-studio/gemini-2.5-flash-lite";
const MENTORA_AI_TRANSCRIBE_LANGUAGES =
    env.MENTORA_AI_TRANSCRIBE_LANGUAGES || "zh-TW,en-US";

const Result = z.object({
    transcription: z.string(),
});

export async function transcribeAudio(
    data: Parameters<typeof Buffer.from>[0],
    mimeType: string,
    language = MENTORA_AI_TRANSCRIBE_LANGUAGES,
): Promise<string> {
    const base64Audio = Buffer.from(data).toString("base64");
    const format =
        mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3" : "wav";

    const response = await ai.google.chat.completions.create({
        model: MENTORA_AI_TRANSCRIBE_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Transcribe the following audio to text.\nLanguage hint from the user: ${language}\nIf the audio is not in the specified language, please still transcribe it to the best of your ability.`,
                    },
                    {
                        type: "input_audio",
                        input_audio: {
                            data: base64Audio,
                            format,
                        },
                    },
                ],
            },
        ],
        response_format: zodResponseFormat(Result, "result"),
    });

    const message = response.choices[0]?.message;
    if (message?.refusal) {
        throw new Error(`Transcription refused: ${message.refusal}`);
    }

    if (!message?.content) {
        throw new Error("No transcription content received");
    }

    const parsed = parseStructuredOutput(
        message.content,
        Result,
        "transcription",
    );

    return parsed.transcription;
}
