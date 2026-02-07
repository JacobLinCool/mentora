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
 * Schema for Stage 3 Classifier output
 */
export const PrincipleReasoningClassifierSchema = z.object({
    thought_process: z.string().describe("簡短分析使用者的回答邏輯、清晰度"),
    detected_intent: z
        .enum(["TR_CLARIFY", "TR_SCAFFOLD", "TR_NEXT_CASE", "TR_COMPLETE"])
        .describe("對應狀態轉移表中的 Trigger ID"),
    confidence_score: z.number().min(0).max(1).describe("信心分數 (0.0 - 1.0)"),
    extracted_data: z
        .object({
            stance: z
                .string()
                .optional()
                .describe("Updated stance if applicable"),
            reasoning: z
                .string()
                .optional()
                .describe("The principle or reasoning extracted"),
        })
        .describe("選填：若有提取到關鍵資訊放在這裡"),
});

export type PrincipleReasoningClassifier = z.infer<
    typeof PrincipleReasoningClassifierSchema
>;

/**
 * Schema for Stage 3 Response Generator output
 */
export const PrincipleReasoningResponseSchema = z.object({
    thought_process: z.string().describe("根據使用者的輸入簡要規劃要說的話"),
    response_message: z.string().describe("主要對話文字（確認、過渡或解釋）"),
    concise_question: z.string().describe("用於觸發使用者下一個思考的具體問題"),
});

export type PrincipleReasoningResponse = z.infer<
    typeof PrincipleReasoningResponseSchema
>;

type PrincipleReasoningClassifyInput = {
    currentStance: string;
    userInput: string;
};

type PrincipleReasoningResponseInput = {
    discussionSummary: string;
};

type PrincipleReasoningScaffoldInput = {
    userPrinciple: string;
    detectedTension?: string;
};

/**
 * Stage 3 Classifier Builder
 */
export class PrincipleReasoningClassifierBuilder implements PromptBuilder<
    PrincipleReasoningClassifyInput,
    PrincipleReasoningClassifier
> {
    async build(
        contents: Content[],
        input: PrincipleReasoningClassifyInput,
    ): Promise<Prompt<PrincipleReasoningClassifier>> {
        const currentStance = input.currentStance || "";
        const userInput = input.userInput || "";

        const systemInstruction = `You are a Dialogue State Classifier.
Current Stage: [PrincipleReasoning_Main]
Goal: Evaluate the abstract principle provided by the student.

Rules:
1. **TR_CLARIFY**: The principle is too vague (e.g., "Just do good things"), tautological, or lacks substance.
2. **TR_SCAFFOLD**: The principle logically conflicts with accepted moral standards (e.g., justifying crime for safety) OR conflicts with the student's own previous admissions.
3. **TR_NEXT_CASE**: The principle is understandable but feels "shaky" or "incomplete". It needs testing with another case to verify its robustness. (Use this for looping back to Stage 2).
4. **TR_COMPLETE**: The principle is solid, comprehensive, and consistent. The student has demonstrated deep thinking. (Ready for Closure).

Context:
Current Stance: ${currentStance}
User Input: ${userInput}

${CLASSIFIER_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: PrincipleReasoningClassifierSchema,
        };
    }
}

/**
 * Stage 3 Response Generator Builder (Principle Extraction)
 */
export class PrincipleReasoningResponseBuilder implements PromptBuilder<
    PrincipleReasoningResponseInput,
    PrincipleReasoningResponse
> {
    async build(
        contents: Content[],
        input: PrincipleReasoningResponseInput,
    ): Promise<Prompt<PrincipleReasoningResponse>> {
        const discussionSummary = input.discussionSummary || "";

        const systemInstruction = `${RESPONSE_GENERATOR_BASE_SYSTEM_PROMPT}

當前階段: [PrincipleReasoning_Main]
討論歷史摘要: "${discussionSummary}"

任務:
1. 總結到目前為止從討論案例中獲得的見解。
2. 要求使用者制定一個處理這些情況的一般性原則或規則。

${RESPONSE_GENERATOR_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: PrincipleReasoningResponseSchema,
        };
    }
}

/**
 * Stage 3 TR_SCAFFOLD Response Generator Builder
 */
export class PrincipleReasoningScaffoldBuilder implements PromptBuilder<
    PrincipleReasoningScaffoldInput,
    PrincipleReasoningResponse
> {
    async build(
        contents: Content[],
        input: PrincipleReasoningScaffoldInput,
    ): Promise<Prompt<PrincipleReasoningResponse>> {
        const userPrinciple = input.userPrinciple || "";
        const detectedTension =
            input.detectedTension ||
            "Safety vs. Morality (or Logic Inconsistency)";

        const systemInstruction = `${RESPONSE_GENERATOR_BASE_SYSTEM_PROMPT}

當前階段: [PrincipleReasoning_Scaffold]
使用者的原則: "${userPrinciple}"
偵測到的張力: ${detectedTension}

任務:
1. 使用「蘇格拉底式挑戰」來突顯其原則的後果。
2. 詢問他們是否接受這個後果，或者是否想修改該原則。

${RESPONSE_GENERATOR_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: PrincipleReasoningResponseSchema,
        };
    }
}

/**
 * Exported builders for Stage 3
 */
export const principleReasoningBuilders = {
    classifier: new PrincipleReasoningClassifierBuilder(),
    reasoning: new PrincipleReasoningResponseBuilder(),
    scaffold: new PrincipleReasoningScaffoldBuilder(),
};
