import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ai } from "../../src/lib/server/ai/shared";
import {
    MENTORA_AI_TRANSCRIBE_MAX_BYTES,
    resolveTranscriptionAudioFormat,
    transcribeAudio,
} from "../../src/lib/server/ai/transcribe";

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

    it("maps supported MIME types to provider format", () => {
        expect(resolveTranscriptionAudioFormat("audio/mpeg")).toBe("mp3");
        expect(
            resolveTranscriptionAudioFormat("audio/mpeg; charset=utf-8"),
        ).toBe("mp3");
        expect(resolveTranscriptionAudioFormat("audio/wav")).toBe("wav");
    });

    it("rejects unsupported MIME type before API call", async () => {
        const createSpy = vi.spyOn(ai.google.chat.completions, "create");

        await expect(
            transcribeAudio(Buffer.from("audio"), "audio/ogg", "en-US"),
        ).rejects.toThrow("Unsupported audio MIME type: audio/ogg");
        expect(createSpy).not.toHaveBeenCalled();
    });

    it("accepts payload at the configured max size", async () => {
        vi.spyOn(ai.google.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            transcription: "at-limit",
                        }),
                    },
                },
            ],
        } as unknown as TranscribeCompletionResponse);

        const atLimit = Buffer.alloc(MENTORA_AI_TRANSCRIBE_MAX_BYTES, 1);

        await expect(
            transcribeAudio(atLimit, "audio/wav", "en-US"),
        ).resolves.toBe("at-limit");
    });

    it("rejects payload over the configured max size before API call", async () => {
        const createSpy = vi.spyOn(ai.google.chat.completions, "create");

        const overLimit = Buffer.alloc(MENTORA_AI_TRANSCRIBE_MAX_BYTES + 1, 1);
        await expect(
            transcribeAudio(overLimit, "audio/wav", "en-US"),
        ).rejects.toThrow(
            `Audio payload exceeds max size of ${MENTORA_AI_TRANSCRIBE_MAX_BYTES} bytes`,
        );
        expect(createSpy).not.toHaveBeenCalled();
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
