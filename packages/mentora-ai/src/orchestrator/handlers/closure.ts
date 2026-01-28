/**
 * Stage 4: Closure Handler
 */
import {
    closureBuilders,
    type ClosureDecision,
} from "../../builder/stage4-closure.js";
import { DialogueStage, SubState } from "../../builder/types.js";
import { transitionTo } from "../state.js";
import type { StageContext, StageHandler, StageResult } from "../types.js";

/**
 * Handler for Stage 4: Closure
 *
 * Responsibilities:
 * - Present summary for confirmation
 * - Handle summary corrections
 * - Finalize and end conversation
 */
export class ClosureHandler implements StageHandler {
    readonly stage = DialogueStage.CLOSURE;

    async handle(context: StageContext): Promise<StageResult> {
        const { executor, state, studentMessage } = context;

        // Analyze student's response to summary
        const analyzerPrompt = await closureBuilders.analyzer.build(
            state.conversationHistory,
            {
                topic: state.topic,
                previousSummary: state.summary || "",
                studentMessage,
            },
        );

        const decision = (await executor.execute(
            analyzerPrompt,
        )) as ClosureDecision;

        if (decision.action === "clarify") {
            return this.handleClarify(context, decision);
        }

        return this.handleConfirmEnd(context);
    }

    /**
     * Handle clarification/correction of summary
     */
    private async handleClarify(
        context: StageContext,
        decision: ClosureDecision,
    ): Promise<StageResult> {
        const { executor, state, studentMessage } = context;

        const clarifyPrompt = await closureBuilders.clarify.build(
            state.conversationHistory,
            {
                topic: state.topic,
                previousSummary: state.summary || "",
                studentCorrection: decision.correctionNeeded || studentMessage,
            },
        );

        const message = (await executor.execute(clarifyPrompt)) as string;

        return {
            message,
            newState: {
                ...transitionTo(state, DialogueStage.CLOSURE, SubState.CLARIFY),
                summary: decision.correctedSummary || state.summary,
            },
            ended: false,
        };
    }

    /**
     * Handle confirmation and end conversation
     */
    private async handleConfirmEnd(
        context: StageContext,
    ): Promise<StageResult> {
        const { executor, state } = context;

        const finalPrompt = await closureBuilders.final.build(
            state.conversationHistory,
            {
                topic: state.topic,
                finalSummary: state.summary || "",
            },
        );

        const message = (await executor.execute(finalPrompt)) as string;

        return {
            message,
            newState: transitionTo(state, DialogueStage.ENDED, SubState.MAIN),
            ended: true,
        };
    }
}
