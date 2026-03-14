import type { Content } from "@google/genai";
import { z } from "zod";

import type { Prompt, PromptBuilder } from "../types.js";
import { buildContents } from "./utils.js";

/**
 * Schema for Stage 4 Assessment output
 */
const DimensionScoreSchema = z.object({
    score: z.number().min(1).max(5),
    feedback: z.string(),
});

export const AssessmentOutputSchema = z.object({
    dimensions: z.object({
        argumentQuality: DimensionScoreSchema,
        criticalThinking: DimensionScoreSchema,
        principleExtraction: DimensionScoreSchema,
        openness: DimensionScoreSchema,
        coherence: DimensionScoreSchema,
    }),
    overallScore: z.number().min(1).max(5),
    overallFeedback: z.string(),
});

export type AssessmentOutput = z.infer<typeof AssessmentOutputSchema>;

type AssessmentInput = {
    stanceHistory: string;
    loopCount: string;
    principleHistory: string;
};

/**
 * Stage 4 Assessment Builder
 * Generates an AI assessment of the student's performance across 5 dimensions.
 */
export class AssessmentBuilder implements PromptBuilder<
    AssessmentInput,
    AssessmentOutput
> {
    async build(
        contents: Content[],
        input: AssessmentInput,
    ): Promise<Prompt<AssessmentOutput>> {
        const systemInstruction = `你是一位教學評估專家。根據以下蘇格拉底式對話的完整記錄，評估學生在五個維度上的表現。

評估依據：
- loopCount: 經歷 ${input.loopCount} 輪辯論循環

立場歷程：
${input.stanceHistory}

原則歷程：
${input.principleHistory}

五個評估維度（每個 1-5 分）：
1. argumentQuality（論證品質）：立場是否清晰？論點是否有邏輯支撐？
2. criticalThinking（批判思考）：面對反論時是否能有效回應？是否展現分析能力？
3. principleExtraction（原則提煉）：能否從具體案例中歸納出抽象原則？原則的層次如何？
4. openness（開放性）：面對挑戰時是否願意修正立場？信心變化是否合理？
5. coherence（論述連貫性）：前後論點是否一致？立場轉變是否有充分說明？

整體分數為五維度的平均值（四捨五入至一位小數）。

Respond ONLY in JSON format.`;

        return {
            systemInstruction,
            contents: buildContents(contents),
            schema: AssessmentOutputSchema,
        };
    }
}

export const assessmentBuilder = new AssessmentBuilder();
