import type { Content } from "@google/genai";
import { z } from "zod";

import type { JsonValue, Prompt, PromptBuilder } from "../types.js";

/**
 * Schema for Stage 2 decision output
 */
export const CaseChallengeDecisionSchema = z.object({
    action: z
        .enum([
            "clarify",
            "scaffold",
            "continue_challenge",
            "advance_to_principle",
        ])
        .describe("Action to take based on student response to case challenge"),
    stanceChanged: z
        .boolean()
        .describe(
            "Whether the student's stance appears to have changed or wavered",
        ),
    newStance: z
        .string()
        .nullable()
        .describe("The student's new stance position, if changed"),
    newReason: z
        .string()
        .nullable()
        .describe("The student's new reasoning, if stance changed"),
    contradiction: z
        .string()
        .nullable()
        .describe(
            "Detected contradiction between current response and previous stance",
        ),
    message: z.string().describe("Response message to send to the student"),
    reasoning: z.string().describe("Internal reasoning for the decision"),
});

export type CaseChallengeDecision = z.infer<typeof CaseChallengeDecisionSchema>;

/**
 * Builder for generating case challenge scenarios
 * Creates challenging case studies to test the student's stance
 */
export class CaseChallengeBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const currentStance = input.currentStance || "";
        const currentReason = input.currentReason || "";
        const loopCount = input.loopCount || "0";
        const previousCases = input.previousCases || "";

        const systemPrompt = `你是 Mentora，正在進行 Stage 2: Case Challenge（案例挑戰）。

===== 討論主題 =====
${topic}

===== 學生當前立場 (V${parseInt(loopCount) + 1}) =====
立場：${currentStance}
理由：${currentReason}

${previousCases ? `===== 先前已使用的案例 =====\n${previousCases}\n（請避免重複使用類似案例）` : ""}

===== 你的任務 =====
生成一個具有挑戰性的案例情境，目的是：
1. 測試學生立場的一致性
2. 揭示潛在的盲點或例外情況
3. 不是為了「贏」學生，而是引導更深入的思考

===== 案例設計原則 =====
- 案例應該是合理且可信的情境
- 應該直接挑戰學生所持立場的核心假設
- 使用具體、生動的描述
- 以問題結尾，請學生評估這個情境

===== 輸出格式 =====
用繁體中文輸出：
1. 案例情境描述
2. 針對此案例的挑戰性問題`;

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
 * Builder for analyzing student's response to case challenge
 */
export class CaseChallengeAnalyzerBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const currentStance = input.currentStance || "";
        const currentReason = input.currentReason || "";
        const studentMessage = input.studentMessage || "";
        const caseDescription = input.caseDescription || "";
        const loopCount = input.loopCount || "0";

        const systemPrompt = `你是 Mentora 的分析模組。分析學生對案例挑戰的回應。

===== 討論主題 =====
${topic}

===== 學生當前立場 (V${parseInt(loopCount) + 1}) =====
立場：${currentStance}
理由：${currentReason}

===== 呈現的案例 =====
${caseDescription}

===== 學生對案例的回應 =====
${studentMessage}

===== 分析標準 =====

1. **clarify** - 當學生回應不清楚，無法判斷其態度
2. **scaffold** - 當學生立場動搖或出現矛盾，需要引導更新立場
   - 學生承認案例與其原立場有衝突
   - 學生對原立場表示懷疑
   - 學生的回應明顯與原立場矛盾
3. **continue_challenge** - 學生維持原立場，但討論尚未充分
4. **advance_to_principle** - 學生立場穩固，可以進入原則推理

===== 循環次數考量 =====
當前為第 ${parseInt(loopCount) + 1} 次循環。
- 若已進行 2+ 次有效討論且立場穩固，傾向 advance_to_principle
- 若立場仍有搖擺空間，可繼續挑戰

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
            schema: CaseChallengeDecisionSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Builder for clarifying unclear response to case challenge
 */
export class CaseChallengeClarifyBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const caseDescription = input.caseDescription || "";

        const systemPrompt = `你是 Mentora，正在進行 Stage 2 的澄清流程。

===== 討論主題 =====
${topic}

===== 先前呈現的案例 =====
${caseDescription}

===== 當前情況 =====
學生對這個案例的回應不夠清楚，需要進一步澄清。

===== 你的任務 =====
生成一個引導性問題，幫助學生更清楚地表達：
1. 他們如何評價這個案例中的情境
2. 這個案例是否影響了他們原本的想法
3. 使用更具體的問題引導學生聚焦

===== 輸出格式 =====
直接輸出繁體中文的澄清問題。`;

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
 * Builder for scaffolding stance update when student wavers
 */
export class CaseChallengeScaffoldBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const originalStance = input.originalStance || "";
        const originalReason = input.originalReason || "";
        const contradiction = input.contradiction || "";
        const studentResponse = input.studentResponse || "";

        const systemPrompt = `你是 Mentora，正在進行 Stage 2 的 Scaffold（鷹架引導）。

===== 討論主題 =====
${topic}

===== 學生原立場 =====
立場：${originalStance}
理由：${originalReason}

===== 學生最新回應 =====
${studentResponse}

===== 偵測到的矛盾/動搖 =====
${contradiction}

===== 你的任務 =====
引導學生明確其立場更新：
1. 客觀地指出學生新回應與原立場之間的差異或矛盾
2. 不要批評學生，而是幫助他們意識到思考的演變
3. 詢問學生是否想要修正或更新他們的立場
4. 提供一個結構化的問題幫助學生重新表述

===== 輸出格式 =====
用繁體中文輸出：
1. 對矛盾的客觀觀察
2. 詢問學生是否要更新立場的問題`;

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

export const caseChallengeBuilders = {
    challenge: new CaseChallengeBuilder(),
    analyzer: new CaseChallengeAnalyzerBuilder(),
    clarify: new CaseChallengeClarifyBuilder(),
    scaffold: new CaseChallengeScaffoldBuilder(),
};
