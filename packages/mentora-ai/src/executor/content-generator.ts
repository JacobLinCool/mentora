import type { GoogleGenAI } from "@google/genai";
import { ContentExecutor } from "../index.js";
import { BaseTokenTracker } from "./token-tracker.js";

const SYSTEM_INSTRUCTION = `你是一位專業的教育內容生成助手。
你的任務是根據提供的問題，搜尋相關資料且產生詳細且有用的參考內容，包括：

1. **問題核心概念**：解釋這個問題的核心概念和重點
2. **詳細描述**：提供問題背景和相關脈絡
3. **關鍵名詞定義**：定義問題中的重要術語和概念

請以清晰、結構化的方式呈現內容，幫助學生更深入理解問題的內涵。
使用繁體中文回答，並確保內容準確且易於理解。`;

/**
 * Executor for running content generation tasks (like classification and response generation) using Gemini
 */
export class GeminiContentExecutor
    extends BaseTokenTracker
    implements ContentExecutor
{
    constructor(
        private genai: GoogleGenAI,
        private model: string,
    ) {
        super();
    }

    /**
     * Generate content based on the provided question
     * Token usage is accumulated in currentTurnUsage
     */
    async generateContent(question: string): Promise<string> {
        return this.executeWithRetry(async () => {
            const response = await this.genai.models.generateContent({
                model: this.model,
                contents: [{ text: question }],
                config: {
                    responseMimeType: "text/plain",
                    systemInstruction: SYSTEM_INSTRUCTION,
                    tools: [
                        {
                            googleSearch: {},
                        },
                    ],
                },
            });

            // Accumulate token usage
            this.accumulateUsage(response.usageMetadata);

            const text = response.text;
            if (!text?.trim()) {
                throw new Error("Empty response from content generator");
            }

            return text;
        }, "Content generation");
    }
}
