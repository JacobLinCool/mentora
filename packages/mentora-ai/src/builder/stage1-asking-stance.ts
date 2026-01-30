import type { Content } from "@google/genai";
import { z } from "zod";

import type { JsonValue, Prompt, PromptBuilder } from "../types.js";

/**
 * Schema for Stage 1 decision output
 */
export const AskingStanceDecisionSchema = z.object({
    action: z
        .enum(["clarify", "confirm_stance"])
        .describe("Action to take based on student response"),
    stance: z
        .string()
        .nullable()
        .describe("The student's stance position, if clearly identified"),
    reason: z
        .string()
        .nullable()
        .describe("The student's reasoning for their stance, if provided"),
    message: z.string().describe("Response message to send to the student"),
    reasoning: z.string().describe("Internal reasoning for the decision"),
});

export type AskingStanceDecision = z.infer<typeof AskingStanceDecisionSchema>;

/**
 * Builder for initial stance question
 * Generates the opening question to establish the student's initial position (V1)
 */
export class AskingStanceBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const topicContext = input.topicContext || "";

        const systemPrompt = `你是 Mentora，一位專業的蘇格拉底式對話引導者。你的任務是引導學生進行深度思考討論。

===== 當前討論主題 =====
${topic}

${topicContext ? `===== 背景脈絡 =====\n${topicContext}` : ""}

===== 你的任務 =====
這是對話的開始階段（Stage 1: Asking Stance）。
你需要：
1. 簡要介紹今天的討論主題
2. 請學生分享他們對這個議題的初始看法/立場
3. 用友善但專業的語氣，鼓勵學生表達直覺想法

===== 輸出格式 =====
直接用繁體中文回覆學生的開場訊息，包含：
- 簡短的主題介紹
- 請學生分享初始立場的問題`;

        const newContents: Content[] = [
            {
                role: "user",
                parts: [{ text: systemPrompt }],
            },
            ...contents,
        ];

        return {
            contents: newContents,
            schema: null,
        };
    }
}

/**
 * Builder for analyzing student's stance response
 * Determines whether to clarify or confirm the stance
 */
export class AskingStanceAnalyzerBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const studentMessage = input.studentMessage || "";

        const systemPrompt = `你是 Mentora 的分析模組。分析學生的回應，判斷是否已明確表達立場。

===== 討論主題 =====
${topic}

===== 學生回應 =====
${studentMessage}

===== 分析標準 =====
要判斷為「confirm_stance」（確認立場），學生的回應必須：
1. 明確表達贊成或反對的立場（不能只說「都有道理」或「很難說」）
2. 至少提供一個支持該立場的理由

若學生回應曖昧不清或沒有明確立場，應選擇「clarify」（請求澄清）。

===== 澄清訊息指引 =====
若需要澄清，訊息應：
- 承認議題確實有兩面性
- 但仍請學生先選擇一邊站
- 用引導性問題幫助學生聚焦

===== 輸出要求 =====
請用繁體中文作答，message 字段是要直接給學生看的回覆。`;

        const newContents: Content[] = [
            {
                role: "user",
                parts: [{ text: systemPrompt }],
            },
            ...contents,
        ];

        return {
            contents: newContents,
            schema: AskingStanceDecisionSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Builder for clarifying unclear stance
 * Used when student's initial response is ambiguous
 */
export class AskingStanceClarifyBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const previousAttempts = input.previousAttempts || "1";

        const systemPrompt = `你是 Mentora，正在進行 Stage 1: Asking Stance 的澄清流程。

===== 討論主題 =====
${topic}

===== 當前情況 =====
學生尚未給出明確立場，這是第 ${previousAttempts} 次嘗試澄清。

===== 你的任務 =====
生成一個更具引導性的問題，幫助學生表達明確立場：
1. 承認這個問題確實複雜
2. 但請學生先選擇一個傾向（即使暫時的）
3. 可以使用「如果一定要選...」或「您的直覺更傾向哪一邊？」等引導語

===== 輸出格式 =====
直接輸出繁體中文的引導問題，語氣友善但堅定。`;

        const newContents: Content[] = [
            {
                role: "user",
                parts: [{ text: systemPrompt }],
            },
            ...contents,
        ];

        return {
            contents: newContents,
            schema: null,
        };
    }
}

export const askingStanceBuilders = {
    initial: new AskingStanceBuilder(),
    analyzer: new AskingStanceAnalyzerBuilder(),
    clarify: new AskingStanceClarifyBuilder(),
};
