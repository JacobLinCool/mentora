import type { GoogleGenAI } from "@google/genai";

import type { ASRExecutor } from "../types.js";
import { BaseTokenTracker } from "./token-tracker.js";

/**
 * Executor for running ASR (Automatic Speech Recognition) tasks using Gemini
 */
export class GeminiASRExecutor extends BaseTokenTracker implements ASRExecutor {
    constructor(
        private genai: GoogleGenAI,
        private model: string,
    ) {
        super();
    }

    /**
     * Transcribe audio content
     * @param audioBase64 - Base64 encoded audio string
     * @param mimeType - MIME type of the audio (default: audio/mp3)
     * @returns Transcribed text
     */
    async transcribe(
        audioBase64: string,
        mimeType: string = "audio/mp3",
    ): Promise<string> {
        const contents = [
            { text: "請將以下音訊語音辨識成繁體中文文字" },
            {
                inlineData: {
                    data: audioBase64,
                    mimeType: mimeType,
                },
            },
        ];

        return this.executeWithRetry(async () => {
            const response = await this.genai.models.generateContent({
                model: this.model,
                contents: contents,
            });

            // Accumulate token usage
            this.accumulateUsage(response.usageMetadata);

            const text = response.text;
            if (!text?.trim()) {
                throw new Error("Empty response from ASR model");
            }

            return text;
        }, "ASR transcription");
    }
}
