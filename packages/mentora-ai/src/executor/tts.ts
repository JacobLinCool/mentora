/**
 * GeminiTTSExecutor implements text-to-speech using Google Gemini API
 */
import type { GoogleGenAI } from "@google/genai";
import type { TTSExecutor } from "../types.js";
import { BaseTokenTracker } from "./token-tracker.js";

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
     * @returns Base64 encoded audio (MP3 format)
     */
    async synthesize(text: string): Promise<string> {
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

            // Accumulate token usage
            this.accumulateUsage(response.usageMetadata);

            const speech =
                response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!speech) {
                throw new Error("No audio data received from TTS model");
            }

            return speech;
        } catch (error) {
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
