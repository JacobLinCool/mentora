import type { Content } from "@google/genai";
import { z } from "zod";

import type { JsonValue, Prompt, PromptBuilder } from "../types.js";
import {
    CLASSIFIER_OUTPUT_FORMAT,
    RESPONSE_GENERATOR_BASE_SYSTEM_PROMPT,
    RESPONSE_GENERATOR_OUTPUT_FORMAT,
} from "./prompts.js";
import { buildContents } from "./utils.js";

/**
 * Schema for Stage 1 Classifier output
 */
export const AskingStanceClassifierSchema = z.object({
    thought_process: z.string().describe("簡短分析使用者的回答邏輯、清晰度"),
    detected_intent: z
        .enum(["TR_CLARIFY", "TR_V1_ESTABLISHED"])
        .describe("對應狀態轉移表中的 Trigger ID"),
    confidence_score: z.number().min(0).max(1).describe("信心分數 (0.0 - 1.0)"),
    extracted_data: z
        .object({
            stance: z.string().optional().describe("The user's stated stance"),
            reasoning: z.string().optional().describe("The user's reasoning"),
        })
        .describe("選填：若有提取到關鍵資訊放在這裡"),
});

export type AskingStanceClassifier = z.infer<
    typeof AskingStanceClassifierSchema
>;

/**
 * Schema for Stage 1 Response Generator output
 */
export const AskingStanceResponseSchema = z.object({
    thought_process: z.string().describe("根據使用者的輸入簡要規劃要說的話"),
    response_message: z.string().describe("主要對話文字（確認、過渡或解釋）"),
    concise_question: z.string().describe("用於觸發使用者下一個思考的具體問題"),
});

export type AskingStanceResponse = z.infer<typeof AskingStanceResponseSchema>;

/**
 * Stage 1 Classifier Builder
 */
export class AskingStanceClassifierBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const currentQuestion = input.currentQuestion || "";
        const userInput = input.userInput || "";

        const systemInstruction = `You are a Dialogue State Classifier for an educational AI.
Current Stage: [AskingStance_Main]
Goal: Determine if the student has clearly expressed their initial stance (Yes/No/Depends) with a basic reason.

Rules:
1. If the input is too short, vague, irrelevant, or does not answer the specific question -> Output "TR_CLARIFY".
2. If the user expresses a clear stance (even if simple) -> Output "TR_V1_ESTABLISHED".

Analyze the user input below:
Question: ${currentQuestion}
User Input: ${userInput}

${CLASSIFIER_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: AskingStanceClassifierSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Stage 1 Response Generator Builder (Initial)
 */
export class AskingStanceResponseBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topicDescription = input.topicDescription || input.topic || "";

        const systemInstruction = `${RESPONSE_GENERATOR_BASE_SYSTEM_PROMPT}

當前階段: [AskingStance_Main]
主題: "${topicDescription}"

任務:
1. 簡要介紹主題。
2. 詢問使用者對此決策問題的初步直覺或立場。

情境:
使用者剛剛開始本次對話。

${RESPONSE_GENERATOR_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: AskingStanceResponseSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Exported builders for Stage 1
 * TR_CLARIFY handling uses the same initial builder to re-ask.
 */
export const askingStanceBuilders = {
    classifier: new AskingStanceClassifierBuilder(),
    initial: new AskingStanceResponseBuilder(),
};
