/**
 * Stage 1: Asking Stance Handler
 */
import {
    askingStanceBuilders,
    type AskingStanceDecision,
} from "../../builder/stage1-asking-stance.js";
import { caseChallengeBuilders } from "../../builder/stage2-case-challenge.js";
import { DialogueStage, SubState } from "../../builder/types.js";
import { createStanceVersion, transitionTo } from "../state.js";
import type { StageContext, StageHandler, StageResult } from "../types.js";

/**
 * Handler for Stage 1: Asking Stance
 *
 * Responsibilities:
 * - Generate initial stance question
 * - Analyze student responses for clear stance
 * - Clarify when responses are ambiguous
 * - Transition to Stage 2 when stance is confirmed
 */
export class AskingStanceHandler implements StageHandler {
    readonly stage = DialogueStage.ASKING_STANCE;

    async handle(context: StageContext): Promise<StageResult> {
        const { executor, state, studentMessage } = context;

        // Analyze student's response
        const analyzerPrompt = await askingStanceBuilders.analyzer.build(
            state.conversationHistory,
            {
                topic: state.topic,
                studentMessage,
            },
        );

        const decision = (await executor.execute(
            analyzerPrompt,
        )) as AskingStanceDecision;

        if (decision.action === "clarify") {
            return this.handleClarify(context);
        }

        return this.handleConfirmStance(context, decision);
    }

    /**
     * Handle clarification when stance is unclear
     */
    private async handleClarify(context: StageContext): Promise<StageResult> {
        const { executor, state } = context;

        const clarifyPrompt = await askingStanceBuilders.clarify.build(
            state.conversationHistory,
            {
                topic: state.topic,
                previousAttempts: "1",
            },
        );

        const message = (await executor.execute(clarifyPrompt)) as string;

        return {
            message,
            newState: transitionTo(
                state,
                DialogueStage.ASKING_STANCE,
                SubState.CLARIFY,
            ),
            ended: false,
        };
    }

    /**
     * Handle confirmed stance - create V1 and transition to Stage 2
     */
    private async handleConfirmStance(
        context: StageContext,
        decision: AskingStanceDecision,
    ): Promise<StageResult> {
        const { executor, state, studentMessage } = context;

        // Create initial stance (V1)
        const stance = createStanceVersion(
            decision.stance || studentMessage,
            decision.reason || "",
            1,
        );

        // Generate first case challenge
        const casePrompt = await caseChallengeBuilders.challenge.build(
            state.conversationHistory,
            {
                topic: state.topic,
                currentStance: stance.position,
                currentReason: stance.reason,
                loopCount: "0",
            },
        );

        const message = (await executor.execute(casePrompt)) as string;

        const newState = {
            ...transitionTo(state, DialogueStage.CASE_CHALLENGE, SubState.MAIN),
            currentStance: stance,
            stanceHistory: [stance],
            loopCount: 0,
        };

        return {
            message,
            newState,
            ended: false,
        };
    }
}
