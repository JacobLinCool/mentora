import type { GoogleGenAI, Part } from "@google/genai";

import type { ASRExecutor, TokenUsage } from "../types.js";

/**
 * Executor for running ASR (Automatic Speech Recognition) tasks using Gemini
 */
export class GeminiASRExecutor implements ASRExecutor {
    private currentTurnUsage: TokenUsage = {
        cachedContentTokenCount: 0,
        candidatesTokenCount: 0,
        promptTokenCount: 0,
        thoughtsTokenCount: 0,
        toolUsePromptTokenCount: 0,
        totalTokenCount: 0,
    };

    constructor(
        private genai: GoogleGenAI,
        private model: string,
    ) {}

    /**
     * Get the token usage for the current turn
     */
    getTokenUsage(): TokenUsage {
        return { ...this.currentTurnUsage };
    }

    /**
     * Reset the token usage counter for a new turn
     */
    resetTokenUsage(): void {
        this.currentTurnUsage = {
            cachedContentTokenCount: 0,
            candidatesTokenCount: 0,
            promptTokenCount: 0,
            thoughtsTokenCount: 0,
            toolUsePromptTokenCount: 0,
            totalTokenCount: 0,
        };
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
        // Construct the audio part
        const audioPart: Part = {
            inlineData: {
                data: audioBase64,
                mimeType: mimeType,
            },
        };

        // Construct the prompt for transcription
        const prompt = {
            contents: [
                {
                    role: "user",
                    parts: [
                        audioPart,
                        { text: "Please transcribe the audio accurately." },
                    ],
                },
            ],
        };

        try {
            const response = await this.genai.models.generateContent({
                model: this.model,
                contents: prompt.contents,
            });

            // Accumulate token usage
            const usage = response.usageMetadata;
            this.currentTurnUsage.cachedContentTokenCount =
                (this.currentTurnUsage.cachedContentTokenCount ?? 0) +
                (usage?.cachedContentTokenCount ?? 0);
            this.currentTurnUsage.candidatesTokenCount =
                (this.currentTurnUsage.candidatesTokenCount ?? 0) +
                (usage?.candidatesTokenCount ?? 0);
            this.currentTurnUsage.promptTokenCount =
                (this.currentTurnUsage.promptTokenCount ?? 0) +
                (usage?.promptTokenCount ?? 0);
            this.currentTurnUsage.thoughtsTokenCount =
                (this.currentTurnUsage.thoughtsTokenCount ?? 0) +
                (usage?.thoughtsTokenCount ?? 0);
            this.currentTurnUsage.toolUsePromptTokenCount =
                (this.currentTurnUsage.toolUsePromptTokenCount ?? 0) +
                (usage?.toolUsePromptTokenCount ?? 0);
            this.currentTurnUsage.totalTokenCount =
                (this.currentTurnUsage.totalTokenCount ?? 0) +
                (usage?.totalTokenCount ?? 0);

            const text = response.text;
            if (!text) {
                throw new Error("Empty response from ASR model");
            }

            return text;
        } catch (error) {
            throw new Error(
                `ASR failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }
}
