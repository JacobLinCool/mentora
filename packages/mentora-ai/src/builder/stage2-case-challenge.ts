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
 * Schema for Stage 2 Classifier output
 * Matches CSV: detected_intent is TR_CLARIFY, TR_SCAFFOLD, or TR_CASE_COMPLETED
 */
export const CaseChallengeClassifierSchema = z.object({
    thought_process: z
        .string()
        .describe("簡短分析使用者的回答邏輯、清晰度以及是否與先前立場矛盾"),
    detected_intent: z
        .enum(["TR_CLARIFY", "TR_SCAFFOLD", "TR_CASE_COMPLETED"])
        .describe("對應狀態轉移表中的 Trigger ID"),
    confidence_score: z.number().min(0).max(1).describe("信心分數 (0.0 - 1.0)"),
    extracted_data: z
        .object({
            stance: z
                .string()
                .optional()
                .describe("New or updated stance if applicable"),
            reasoning: z
                .string()
                .optional()
                .describe("New or updated reasoning if applicable"),
        })
        .describe("選填：若有提取到關鍵資訊放在這裡"),
});

export type CaseChallengeClassifier = z.infer<
    typeof CaseChallengeClassifierSchema
>;

/**
 * Schema for Stage 2 Response Generator output
 */
export const CaseChallengeResponseSchema = z.object({
    thought_process: z.string().describe("根據使用者的輸入簡要規劃要說的話"),
    response_message: z.string().describe("主要對話文字（確認、過渡或解釋）"),
    concise_question: z.string().describe("用於觸發使用者下一個思考的具體問題"),
});

export type CaseChallengeResponse = z.infer<typeof CaseChallengeResponseSchema>;

/**
 * Stage 2 Classifier Builder
 */
export class CaseChallengeClassifierBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const previousStance = input.previousStance || "";
        const currentCase = input.currentCase || "";
        const userInput = input.userInput || "";

        const systemInstruction = `You are a Dialogue State Classifier.
Current Stage: [CaseChallenge_Main]
Goal: Analyze how the student reacts to a counter-example (Challenge Case).

Rules:
1. **TR_CLARIFY**: The answer is off-topic, too short, or logically unclear.
2. **TR_SCAFFOLD**: The user's answer contradicts their \`previous_stance\`, shows hesitation ("Maybe I was wrong"), or admits the counter-example is valid, implying a need to update their stance.
3. **TR_CASE_COMPLETED**: The user defends their stance logically, OR successfully integrates the case into their existing view without contradiction.

Context:
Previous Stance: ${previousStance}
Current Case Challenge: ${currentCase}
User Input: ${userInput}

${CLASSIFIER_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: CaseChallengeClassifierSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Stage 2 Response Generator Builder (Case Challenge)
 */
export class CaseChallengeResponseBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const currentStance = input.currentStance || "";
        const caseContent = input.caseContent || "";

        const systemInstruction = `${RESPONSE_GENERATOR_BASE_SYSTEM_PROMPT}

當前階段: [CaseChallenge_Main]
使用者的當前立場: "${currentStance}"
選擇的案例: "${caseContent}"

任務:
1. 簡要認可使用者的立場。
2. 呈現案例來挑戰或探測他們的立場。
3. 針對他們的立場如何應用於此案例提出一個具體問題。

約束:
- 如果案例與其立場矛盾，請問：「在這種情況下，你的觀點仍然成立嗎？」
- 如果案例支持不同的觀點，請問：「這個例子會讓你重新考慮嗎？」

${RESPONSE_GENERATOR_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: CaseChallengeResponseSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Stage 2 TR_SCAFFOLD Response Generator Builder
 */
export class CaseChallengeScaffoldBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const userInput = input.userInput || "";
        const currentStance = input.currentStance || "";

        const systemInstruction = `${RESPONSE_GENERATOR_BASE_SYSTEM_PROMPT}

當前階段: [CaseChallenge_Scaffold]
使用者輸入: "${userInput}"
邏輯衝突: 使用者的輸入似乎與其先前的立場 "${currentStance}" 相矛盾。

任務:
1. 委婉地指出其邏輯中的張力或轉變。
2. 詢問他們是否想要更新或完善其原始立場。

${RESPONSE_GENERATOR_OUTPUT_FORMAT}`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: CaseChallengeResponseSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Exported builders for Stage 2
 */
export const caseChallengeBuilders = {
    classifier: new CaseChallengeClassifierBuilder(),
    challenge: new CaseChallengeResponseBuilder(),
    scaffold: new CaseChallengeScaffoldBuilder(),
};
