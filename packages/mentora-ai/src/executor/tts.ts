/**
 * GeminiTTSExecutor implements text-to-speech using Google Gemini API
 */
import type { GoogleGenAI } from "@google/genai";
import { NoopObserver, type LLMSpan } from "../observability/observer.js";
import type { SynthesizedAudio, TTSExecutor } from "../types.js";
import { BaseTokenTracker } from "./token-tracker.js";
import { encodePcm16AsWav } from "./wav.js";

const PCM_MIME_TYPES = new Set(["audio/l16", "audio/pcm"]);

function normalizeGeminiAudioResponse(audioPart: {
    data?: string;
    mimeType?: string;
}): SynthesizedAudio {
    const { data } = audioPart;
    if (!data) {
        throw new Error("No audio data received from TTS model");
    }

    const normalizedMimeType = audioPart.mimeType
        ?.toLowerCase()
        .split(";")[0]
        ?.trim();

    if (
        normalizedMimeType === "audio/wav" ||
        normalizedMimeType === "audio/wave"
    ) {
        return {
            audioBase64: data,
            mimeType: "audio/wav",
        };
    }

    // Gemini preview TTS returns raw 24 kHz 16-bit mono PCM by default.
    if (!normalizedMimeType || PCM_MIME_TYPES.has(normalizedMimeType)) {
        return encodePcm16AsWav(data);
    }

    throw new Error(
        `Unsupported TTS audio MIME type: ${audioPart.mimeType ?? "<missing>"}`,
    );
}

/**
 * Gemini-based TTS Executor
 * Uses Gemini multimodal API to synthesize speech from text
 */
export class GeminiTTSExecutor extends BaseTokenTracker implements TTSExecutor {
    constructor(
        private genai: GoogleGenAI,
        private model: string,
    ) {
        super();
    }

    /**
     * Synthesize text to speech
     * @param text - Text to synthesize
     * @returns Base64 encoded browser-playable audio
     */
    async synthesize(
        text: string,
        parent?: LLMSpan,
    ): Promise<SynthesizedAudio> {
        const observer = parent ?? NoopObserver.startSpan("tts");
        const generation = observer.generation("gemini.generateContent", {
            model: this.model,
            input: { task: "tts", text },
        });
        let usage:
            | Awaited<
                  ReturnType<typeof this.genai.models.generateContent>
              >["usageMetadata"]
            | undefined;
        try {
            const response = await this.genai.models.generateContent({
                model: this.model,
                contents: [
                    {
                        parts: [
                            { text: "產生以下文字的台灣人口音的語音內容：" },
                            { text },
                        ],
                    },
                ],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: "Kore" },
                        },
                    },
                },
            });
            usage = response.usageMetadata;

            // Accumulate token usage
            this.accumulateUsage(usage);

            const speech =
                response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

            const audio = normalizeGeminiAudioResponse(speech ?? {});
            generation.end({
                output: {
                    mimeType: audio.mimeType,
                    byteLength: audio.audioBase64.length,
                },
                usage,
                model: this.model,
            });
            return audio;
        } catch (error) {
            generation.end({ error, usage, model: this.model });
            console.error(
                "[GeminiTTSExecutor] Error synthesizing speech:",
                error,
            );
            if (error instanceof Error) {
                throw new Error(`TTS synthesis failed: ${error.message}`);
            }
            throw new Error("TTS synthesis failed with unknown error");
        }
    }
}
