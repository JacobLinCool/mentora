import type { Content } from "@google/genai";
import { z } from "zod";

import type { Prompt, PromptBuilder } from "../types.js";
import {
    CLASSIFIER_OUTPUT_FORMAT,
    RESPONSE_GENERATOR_BASE_SYSTEM_PROMPT,
    RESPONSE_GENERATOR_OUTPUT_FORMAT,
} from "./prompts.js";
import { buildContents } from "./utils.js";

/**
 * Schema for Stage 4 Classifier output
 */
export const ClosureClassifierSchema = z.object({
    thought_process: z.string().describe("簡短分析使用者的回答"),
    detected_intent: z
        .enum(["TR_CONFIRM", "TR_CLARIFY"])
        .describe("對應狀態轉移表中的 Trigger ID"),
    confidence_score: z.number().min(0).max(1).describe("信心分數 (0.0 - 1.0)"),
    extracted_data: z
        .object({
            stance: z.string().optional().describe("Any final clarification"),
            reasoning: z
                .string()
                .optional()
                .describe("Any additional reasoning"),
        })
        .describe("選填：若有提取到關鍵資訊放在這裡"),
});

export type ClosureClassifier = z.infer<typeof ClosureClassifierSchema>;

/**
 * Schema for Stage 4 Response Generator output
 */
export const ClosureResponseSchema = z.object({
    thought_process: z.string().describe("根據使用者的輸入簡要規劃要說的話"),
    response_message: z.string().describe("主要對話文字（總結或結語）"),
    concise_question: z.string().describe("確認問題（或空字串表示最終結束語）"),
});

export type ClosureResponse = z.infer<typeof ClosureResponseSchema>;

type ClosureClassifyInput = {
    generatedSummary: string;
    userInput: string;
};

type ClosureResponseInput = {
    stanceV1: string;
    stanceFinal: string;
    keyReasoning: string;
};

/**
 * Stage 4 Classifier Builder
 */
export class ClosureClassifierBuilder implements PromptBuilder<
    ClosureClassifyInput,
    ClosureClassifier
> {
    async build(
        contents: Content[],
        input: ClosureClassifyInput,
    ): Promise<Prompt<ClosureClassifier>> {
        const generatedSummary = input.generatedSummary || "";
        const userInput = input.userInput || "";

        const systemInstruction = `You are a Dialogue State Classifier.
Current Stage: [Closure_Summary]
Goal: Determine if the user agrees with the summary provided.

Rules:
1. **TR_CONFIRM**: The user agrees (e.g., "Yes", "That's right", "Correct").
2. **TR_CLARIFY**: The user disagrees, points out a mistake, or wants to modify the wording (e.g., "No, I didn't mean that", "Actually...").

Context:
Summary Given: ${generatedSummary}
User Input: ${userInput}

${CLASSIFIER_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: ClosureClassifierSchema,
        };
    }
}

/**
 * Stage 4 Response Generator Builder (Summary)
 */
export class ClosureResponseBuilder implements PromptBuilder<
    ClosureResponseInput,
    ClosureResponse
> {
    async build(
        contents: Content[],
        input: ClosureResponseInput,
    ): Promise<Prompt<ClosureResponse>> {
        const stanceV1 = input.stanceV1 || "";
        const stanceFinal = input.stanceFinal || "";
        const keyReasoning = input.keyReasoning || "";

        const systemInstruction = `${RESPONSE_GENERATOR_BASE_SYSTEM_PROMPT}

當前階段: [Closure_Summary]
立場演變:
- V1 (最初): "${stanceV1}"
- V_Final (最終): "${stanceFinal}"
- 關鍵推論: "${keyReasoning}"

任務:
1. 綜合總結使用者的知性之旅。
2. 強調其觀點是如何改變或深化的 (V1 -> V_Final)。
3. 尋求確認。

${RESPONSE_GENERATOR_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: ClosureResponseSchema,
        };
    }
}

/**
 * Exported builders for Stage 4
 */
export const closureBuilders = {
    classifier: new ClosureClassifierBuilder(),
    summary: new ClosureResponseBuilder(),
};
