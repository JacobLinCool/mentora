import type { Content } from "@google/genai";
import { z } from "zod";

import type { JsonValue, Prompt, PromptBuilder } from "../types.js";

/**
 * Schema for Stage 4 (Closure) decision output
 */
export const ClosureDecisionSchema = z.object({
    action: z
        .enum(["clarify", "confirm_end"])
        .describe("Action to take based on student's response to summary"),
    summaryAccepted: z
        .boolean()
        .describe("Whether the student accepted the summary as accurate"),
    correctionNeeded: z
        .string()
        .nullable()
        .describe("Specific correction requested by the student"),
    correctedSummary: z
        .string()
        .nullable()
        .describe("The corrected summary incorporating student feedback"),
    message: z.string().describe("Response message to send to the student"),
    reasoning: z.string().describe("Internal reasoning for the decision"),
});

export type ClosureDecision = z.infer<typeof ClosureDecisionSchema>;

/**
 * Builder for generating final summary
 * Creates a comprehensive summary of the student's stance evolution
 */
export class ClosureBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const stanceHistory = input.stanceHistory || "";
        const finalStance = input.finalStance || "";
        const finalReason = input.finalReason || "";
        const principleHistory = input.principleHistory || "";
        const finalPrinciple = input.finalPrinciple || "";

        const systemPrompt = `你是 Mentora，正在進行 Stage 4: Closure（總結收束）。

===== 討論主題 =====
${topic}

===== 立場演變歷程 =====
${stanceHistory}

===== 最終立場 =====
立場：${finalStance}
理由：${finalReason}

===== 原則發展歷程 =====
${principleHistory}

===== 最終原則 =====
${finalPrinciple}

===== 你的任務 =====
生成一份全面的對話總結：
1. 回顧學生的思考歷程
2. 指出關鍵的轉折點和洞察
3. 整理最終的立場與原則
4. 詢問學生這份總結是否準確

===== 總結結構 =====
- 初始立場概述
- 經過案例挑戰後的思考轉變（如有）
- 歸納出的核心原則
- 最終結論

===== 輸出格式 =====
用繁體中文輸出：
1. 完整的對話內容總結
2. 詢問學生是否同意此總結`;

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
 * Builder for analyzing student's response to summary
 */
export class ClosureAnalyzerBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const previousSummary = input.previousSummary || "";
        const studentMessage = input.studentMessage || "";

        const systemPrompt = `你是 Mentora 的分析模組。分析學生對總結的回應。

===== 討論主題 =====
${topic}

===== 提供的總結 =====
${previousSummary}

===== 學生對總結的回應 =====
${studentMessage}

===== 分析標準 =====

1. **clarify** - 當學生指出總結有誤需要修正
   - 學生說「大部分對，但是...」
   - 學生指出特定用詞或理解有誤
   - 學生希望補充或澄清某些內容

2. **confirm_end** - 當學生確認總結準確
   - 學生明確表示同意
   - 學生說「正確」、「是的」、「沒問題」等

===== 修正總結指引 =====
若需要修正，correctedSummary 應該：
- 保留原總結的正確部分
- 針對學生指出的問題進行調整
- 用更精確的用詞表達學生的意思

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
            schema: ClosureDecisionSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Builder for clarifying and correcting summary
 */
export class ClosureClarifyBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const previousSummary = input.previousSummary || "";
        const studentCorrection = input.studentCorrection || "";

        const systemPrompt = `你是 Mentora，正在進行 Stage 4 的總結修正。

===== 討論主題 =====
${topic}

===== 原先的總結 =====
${previousSummary}

===== 學生的修正意見 =====
${studentCorrection}

===== 你的任務 =====
根據學生的反饋修正總結：
1. 理解學生希望修正的具體內容
2. 調整用詞或表述以更準確反映學生的觀點
3. 生成修正後的總結
4. 詢問修正後的版本是否正確

===== 輸出格式 =====
用繁體中文輸出：
1. 表示理解學生的修正意見
2. 修正後的總結內容
3. 確認問題（這樣修正後是否正確？）`;

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
 * Builder for final closing message
 */
export class ClosureFinalBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const finalSummary = input.finalSummary || "";

        const systemPrompt = `你是 Mentora，對話即將結束。

===== 討論主題 =====
${topic}

===== 確認的最終總結 =====
${finalSummary}

===== 你的任務 =====
生成簡短的結束語：
1. 感謝學生的參與
2. 肯定學生的思考過程
3. 可選：對未來思考的小提示

===== 輸出格式 =====
用繁體中文輸出溫暖、專業的結束語。保持簡潔（2-3 句話即可）。`;

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

export const closureBuilders = {
    summary: new ClosureBuilder(),
    analyzer: new ClosureAnalyzerBuilder(),
    clarify: new ClosureClarifyBuilder(),
    final: new ClosureFinalBuilder(),
};
