import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ai } from "../../src/lib/server/ai/shared";
import { transcribeAudio } from "../../src/lib/server/ai/transcribe";

type TranscribeCompletionResponse = Awaited<
    ReturnType<typeof ai.google.chat.completions.create>
>;

describe("transcribeAudio (unit)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns transcription when payload is valid", async () => {
        vi.spyOn(ai.google.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            transcription: "hello world",
                        }),
                    },
                },
            ],
        } as unknown as TranscribeCompletionResponse);

        await expect(
            transcribeAudio(Buffer.from("audio"), "audio/wav", "en-US"),
        ).resolves.toBe("hello world");
    });

    it("throws a deterministic error on malformed JSON payload", async () => {
        vi.spyOn(ai.google.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {
                        content: "{invalid-json",
                    },
                },
            ],
        } as unknown as TranscribeCompletionResponse);

        await expect(
            transcribeAudio(Buffer.from("audio"), "audio/wav", "en-US"),
        ).rejects.toThrow("Failed to parse transcription JSON payload");
    });

    it("throws when model refuses transcription", async () => {
        vi.spyOn(ai.google.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {
                        refusal: "policy",
                    },
                },
            ],
        } as unknown as TranscribeCompletionResponse);

        await expect(
            transcribeAudio(Buffer.from("audio"), "audio/wav", "en-US"),
        ).rejects.toThrow("Transcription refused: policy");
    });

    it("throws when transcription content is missing", async () => {
        vi.spyOn(ai.google.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {},
                },
            ],
        } as unknown as TranscribeCompletionResponse);

        await expect(
            transcribeAudio(Buffer.from("audio"), "audio/wav", "en-US"),
        ).rejects.toThrow("No transcription content received");
    });
});
