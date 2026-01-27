import type { Content } from "@google/genai";
import { z } from "zod";

import type { JsonValue, Prompt, PromptBuilder } from "../types.js";

/**
 * Schema for Stage 3 decision output
 */
export const PrincipleReasoningDecisionSchema = z.object({
    action: z
        .enum(["clarify", "scaffold", "loop_to_stage2", "advance_to_closure"])
        .describe("Action to take based on student's principle articulation"),
    principleIdentified: z
        .boolean()
        .describe("Whether a clear underlying principle was identified"),
    principle: z
        .string()
        .nullable()
        .describe("The principle statement extracted from student's reasoning"),
    principleClassification: z
        .string()
        .nullable()
        .describe(
            "Classification of the principle (e.g., consequentialist, deontological, virtue-based)",
        ),
    principleChallenge: z
        .string()
        .nullable()
        .describe(
            "A challenge or edge case that tests this principle (for loop_to_stage2)",
        ),
    message: z.string().describe("Response message to send to the student"),
    reasoning: z.string().describe("Internal reasoning for the decision"),
});

export type PrincipleReasoningDecision = z.infer<
    typeof PrincipleReasoningDecisionSchema
>;

/**
 * Builder for principle reasoning extraction
 * Guides student to articulate the underlying principle behind their stance
 */
export class PrincipleReasoningBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const currentStance = input.currentStance || "";
        const currentReason = input.currentReason || "";
        const stanceHistory = input.stanceHistory || "";

        const systemPrompt = `你是 Mentora，正在進行 Stage 3: Principle Reasoning（原則推理）。

===== 討論主題 =====
${topic}

===== 學生當前立場 =====
立場：${currentStance}
理由：${currentReason}

${stanceHistory ? `===== 立場演變歷程 =====\n${stanceHistory}` : ""}

===== 你的任務 =====
引導學生歸納其立場背後的核心原則：
1. 肯定學生經過思考得出的立場
2. 請學生嘗試將其立場抽象化為一個更普遍的原則/規則
3. 這個原則應該能指導類似情境的判斷

===== 引導問題示例 =====
- 「基於您的立場，您會如何制定一個判斷準則？」
- 「什麼樣的一般性原則支持您的這個觀點？」
- 「如果要寫一條適用於類似情境的規則，您會怎麼寫？」

===== 輸出格式 =====
用繁體中文輸出引導學生歸納原則的問題。`;

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
 * Builder for analyzing student's principle articulation
 */
export class PrincipleReasoningAnalyzerBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const currentStance = input.currentStance || "";
        const studentMessage = input.studentMessage || "";
        const loopCount = input.loopCount || "0";

        const systemPrompt = `你是 Mentora 的分析模組。分析學生表述的原則。

===== 討論主題 =====
${topic}

===== 學生當前立場 =====
${currentStance}

===== 學生的原則表述 =====
${studentMessage}

===== 分析標準 =====

1. **clarify** - 當原則表述不明確或過於籠統
   - 例如：「就是看結果好不好」（太模糊）
   - 例如：「反正安全最重要」（需要更具體）

2. **scaffold** - 當發現原則有內在張力，需要引導學生調整
   - 原則與學生自己的道德直覺可能衝突
   - 原則的邏輯推論可能導致學生不接受的結果

3. **loop_to_stage2** - 當原則需要用新案例來測試
   - 原則太過於極端，需要反例挑戰
   - 原則存在明顯道德風險，需要用案例呈現
   - 設計一個能挑戰此原則的案例作為 principleChallenge

4. **advance_to_closure** - 當原則清晰、一致、且經過充分討論
   - 學生能清楚表達原則
   - 原則與其立場一致
   - 已經過足夠的打磨（loopCount >= 1）

===== 循環次數 =====
當前已進行 ${loopCount} 次 Stage 2-3 循環。

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
            schema: PrincipleReasoningDecisionSchema as unknown as z.ZodType<O>,
        };
    }
}

/**
 * Builder for clarifying unclear principle
 */
export class PrincipleReasoningClarifyBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const unclearPrinciple = input.unclearPrinciple || "";

        const systemPrompt = `你是 Mentora，正在進行 Stage 3 的澄清流程。

===== 討論主題 =====
${topic}

===== 學生的原則表述（不夠清晰）=====
${unclearPrinciple}

===== 當前情況 =====
學生的原則表述過於籠統或不夠精確，需要引導他們更清楚地定義。

===== 你的任務 =====
生成引導問題，幫助學生更精確地表述原則：
1. 指出目前表述可能的模糊之處
2. 使用具體例子幫助學生思考
3. 詢問更精確的界定

===== 示例澄清問題 =====
- 「您說的『結果好』具體指什麼？只要技術進步就算結果好嗎？」
- 「這個原則是否意味著任何手段都可以接受？」
- 「請舉一個例子說明這個原則會如何應用？」

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
 * Builder for scaffolding principle refinement
 */
export class PrincipleReasoningScaffoldBuilder implements PromptBuilder {
    async build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(contents: Content[], input: I): Promise<Prompt<O>> {
        const topic = input.topic || "";
        const originalPrinciple = input.originalPrinciple || "";
        const tensionIdentified = input.tensionIdentified || "";
        const studentResponse = input.studentResponse || "";

        const systemPrompt = `你是 Mentora，正在進行 Stage 3 的 Scaffold（鷹架引導）。

===== 討論主題 =====
${topic}

===== 學生原先的原則 =====
${originalPrinciple}

===== 學生最新的回應 =====
${studentResponse}

===== 發現的張力/衝突 =====
${tensionIdentified}

===== 你的任務 =====
引導學生完善其原則：
1. 客觀指出原則與道德直覺之間的張力
2. 不批評學生，而是幫助他們看到調整的必要
3. 詢問是否需要為原則添加限制條件或調整
4. 提供結構化問題幫助學生重新表述

===== 引導示例 =====
「您發現了『安全結果』與『道德手段』之間的衝突。這意味著我們不能只看結果。您是否想要更新您的原則，加入對手段的道德限制？」

===== 輸出格式 =====
用繁體中文輸出：
1. 對張力的客觀觀察
2. 引導學生更新原則的問題`;

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

export const principleReasoningBuilders = {
    reasoning: new PrincipleReasoningBuilder(),
    analyzer: new PrincipleReasoningAnalyzerBuilder(),
    clarify: new PrincipleReasoningClarifyBuilder(),
    scaffold: new PrincipleReasoningScaffoldBuilder(),
};
