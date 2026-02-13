import { env } from "$env/dynamic/private";
import { Buffer } from "node:buffer";
import { ai, parseStructuredOutput, z, zodResponseFormat } from "./shared";

const MENTORA_AI_TRANSCRIBE_MODEL =
    env.MENTORA_AI_TRANSCRIBE_MODEL || "google-ai-studio/gemini-2.5-flash-lite";
const MENTORA_AI_TRANSCRIBE_LANGUAGES =
    env.MENTORA_AI_TRANSCRIBE_LANGUAGES || "zh-TW,en-US";
const DEFAULT_TRANSCRIBE_MAX_BYTES = 1048576;
const transcribeMaxBytes = Number.parseInt(
    env.MENTORA_AI_TRANSCRIBE_MAX_BYTES || `${DEFAULT_TRANSCRIBE_MAX_BYTES}`,
    10,
);
export const MENTORA_AI_TRANSCRIBE_MAX_BYTES =
    Number.isFinite(transcribeMaxBytes) && transcribeMaxBytes > 0
        ? transcribeMaxBytes
        : DEFAULT_TRANSCRIBE_MAX_BYTES;

const AUDIO_MIME_TO_FORMAT: Record<string, "mp3" | "wav"> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/vnd.wave": "wav",
};

export function resolveTranscriptionAudioFormat(
    mimeType: string,
): "mp3" | "wav" {
    const normalizedMimeType =
        mimeType.toLowerCase().split(";")[0]?.trim() || "";
    const format = AUDIO_MIME_TO_FORMAT[normalizedMimeType];

    if (!format) {
        throw new Error(`Unsupported audio MIME type: ${mimeType}`);
    }

    return format;
}

const Result = z.object({
    transcription: z.string(),
});

export async function transcribeAudio(
    data: Parameters<typeof Buffer.from>[0],
    mimeType: string,
    language = MENTORA_AI_TRANSCRIBE_LANGUAGES,
): Promise<string> {
    const audio = Buffer.from(data);
    if (audio.byteLength > MENTORA_AI_TRANSCRIBE_MAX_BYTES) {
        throw new Error(
            `Audio payload exceeds max size of ${MENTORA_AI_TRANSCRIBE_MAX_BYTES} bytes`,
        );
    }

    const base64Audio = audio.toString("base64");
    const format = resolveTranscriptionAudioFormat(mimeType);

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
