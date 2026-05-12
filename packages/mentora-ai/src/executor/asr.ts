import type { GoogleGenAI } from "@google/genai";

import { NoopObserver, type LLMSpan } from "../observability/observer.js";
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
        parent?: LLMSpan,
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

        const observer = parent ?? NoopObserver.startSpan("asr");

        return this.executeWithRetry(async () => {
            const generation = observer.generation("gemini.generateContent", {
                model: this.model,
                input: {
                    task: "asr",
                    mimeType,
                    audioBytes: audioBase64.length,
                },
            });
            let usage:
                | Awaited<
                      ReturnType<typeof this.genai.models.generateContent>
                  >["usageMetadata"]
                | undefined;
            try {
                const response = await this.genai.models.generateContent({
                    model: this.model,
                    contents: contents,
                });
                usage = response.usageMetadata;

                // Accumulate token usage
                this.accumulateUsage(usage);

                const text = response.text;
                if (!text?.trim()) {
                    throw new Error("Empty response from ASR model");
                }

                generation.end({
                    output: text,
                    usage,
                    model: this.model,
                });
                return text;
            } catch (error) {
                generation.end({ error, usage, model: this.model });
                throw error;
            }
        }, "ASR transcription");
    }
}
