/**
 * Stage 4: Closure Handler
 */
import {
    closureBuilders,
    type ClosureClassifier,
    type ClosureResponse,
} from "../../builder/stage4-closure.js";
import { DialogueStage } from "../../builder/types.js";
import { transitionTo } from "../state.js";
import type { StageContext, StageHandler, StageResult } from "../types.js";

/**
 * Handler for Stage 4: Closure
 *
 * Responsibilities:
 * - Analyze summary confirmation (TR_CONFIRM or TR_CLARIFY)
 * - Handle summary corrections
 * - Finalize and end conversation
 */
export class ClosureHandler implements StageHandler {
    readonly stage = DialogueStage.CLOSURE;

    async handle(context: StageContext): Promise<StageResult> {
        const { executor, state, studentMessage } = context;

        // Get the last model message (the summary that was presented)
        const lastModelMessage =
            state.conversationHistory
                .slice()
                .reverse()
                .find((msg) => msg.role === "model")?.parts?.[0]?.text || "";

        // Step 1: Classify user input using Classifier
        const classifierPrompt = await closureBuilders.classifier.build(
            state.conversationHistory,
            {
                generatedSummary: lastModelMessage,
                userInput: studentMessage,
            },
        );

        const classification = (await executor.execute(
            classifierPrompt,
        )) as ClosureClassifier;

        // Step 2: Route based on detected intent
        if (classification.detected_intent === "TR_CLARIFY") {
            return this.handleClarify(context);
        }

        return this.handleConfirm(context);
    }

    /**
     * Handle clarification/correction of summary (TR_CLARIFY)
     * Re-generates the summary with corrections
     */
    private async handleClarify(context: StageContext): Promise<StageResult> {
        const { executor, state } = context;

        // Get stance evolution for corrected summary
        const stanceV1 = state.stanceHistory[0]?.position || "";
        const stanceFinal = state.currentStance?.position || "";
        const keyReasoning = state.currentPrinciple?.statement || "";

        const summaryPrompt = await closureBuilders.summary.build(
            state.conversationHistory,
            {
                stanceV1,
                stanceFinal,
                keyReasoning,
            },
        );

        const response = (await executor.execute(
            summaryPrompt,
        )) as ClosureResponse;

        const message = `${response.response_message}\n\n${response.concise_question}`;

        return {
            message,
            newState: {
                ...transitionTo(state, DialogueStage.CLOSURE),
                summary: response.response_message,
            },
            ended: false,
            usage: executor.getTokenUsage(),
        };
    }

    /**
     * Handle confirmation and end conversation (TR_CONFIRM)
     */
    private async handleConfirm(context: StageContext): Promise<StageResult> {
        const { executor, state } = context;

        // Final closing message
        const message = "感謝您的參與！希望這次對話對您的思考有所幫助。";

        return {
            message,
            newState: transitionTo(state, DialogueStage.ENDED),
            ended: true,
            usage: executor.getTokenUsage(),
        };
    }
}
