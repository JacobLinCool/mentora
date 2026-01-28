/**
 * Stage 2: Case Challenge Handler
 */
import {
    caseChallengeBuilders,
    type CaseChallengeDecision,
} from "../../builder/stage2-case-challenge.js";
import { principleReasoningBuilders } from "../../builder/stage3-principle-reasoning.js";
import { DialogueStage, SubState } from "../../builder/types.js";
import {
    createStanceVersion,
    formatStanceHistory,
    transitionTo,
} from "../state.js";
import type { StageContext, StageHandler, StageResult } from "../types.js";

/**
 * Handler for Stage 2: Case Challenge
 *
 * Responsibilities:
 * - Generate challenging case scenarios
 * - Analyze student responses for stance changes
 * - Scaffold when stance wavers
 * - Transition to Stage 3 when ready for principle reasoning
 */
export class CaseChallengeHandler implements StageHandler {
    readonly stage = DialogueStage.CASE_CHALLENGE;

    async handle(context: StageContext): Promise<StageResult> {
        const { executor, state, studentMessage } = context;
        const currentStance = state.currentStance!;

        // Analyze student's response
        const analyzerPrompt = await caseChallengeBuilders.analyzer.build(
            state.conversationHistory,
            {
                topic: state.topic,
                currentStance: currentStance.position,
                currentReason: currentStance.reason,
                studentMessage,
                caseDescription: "", // TODO: Track last case presented
                loopCount: state.loopCount.toString(),
            },
        );

        const decision = (await executor.execute(
            analyzerPrompt,
        )) as CaseChallengeDecision;

        switch (decision.action) {
            case "clarify":
                return this.handleClarify(context);

            case "scaffold":
                return this.handleScaffold(context, decision);

            case "continue_challenge":
                return this.handleContinueChallenge(context);

            case "advance_to_principle":
                return this.handleAdvanceToPrinciple(context);

            default:
                // Fallback: return the decision message
                return {
                    message: decision.message,
                    newState: state,
                    ended: false,
                };
        }
    }

    /**
     * Handle clarification for unclear response
     */
    private async handleClarify(context: StageContext): Promise<StageResult> {
        const { executor, state } = context;

        const clarifyPrompt = await caseChallengeBuilders.clarify.build(
            state.conversationHistory,
            {
                topic: state.topic,
                caseDescription: "",
            },
        );

        const message = (await executor.execute(clarifyPrompt)) as string;

        return {
            message,
            newState: transitionTo(
                state,
                DialogueStage.CASE_CHALLENGE,
                SubState.CLARIFY,
            ),
            ended: false,
        };
    }

    /**
     * Handle scaffolding when stance wavers
     */
    private async handleScaffold(
        context: StageContext,
        decision: CaseChallengeDecision,
    ): Promise<StageResult> {
        const { executor, state, studentMessage } = context;
        const currentStance = state.currentStance!;

        const scaffoldPrompt = await caseChallengeBuilders.scaffold.build(
            state.conversationHistory,
            {
                topic: state.topic,
                originalStance: currentStance.position,
                originalReason: currentStance.reason,
                contradiction: decision.contradiction || "",
                studentResponse: studentMessage,
            },
        );

        const message = (await executor.execute(scaffoldPrompt)) as string;

        // Update stance if changed
        let newState = transitionTo(
            state,
            DialogueStage.CASE_CHALLENGE,
            SubState.SCAFFOLD,
        );

        if (decision.stanceChanged && decision.newStance) {
            const newStance = createStanceVersion(
                decision.newStance,
                decision.newReason || "",
                state.stanceHistory.length + 1,
            );
            newState = {
                ...newState,
                currentStance: newStance,
                stanceHistory: [...state.stanceHistory, newStance],
            };
        }

        return {
            message,
            newState,
            ended: false,
        };
    }

    /**
     * Handle continuing with more case challenges
     */
    private async handleContinueChallenge(
        context: StageContext,
    ): Promise<StageResult> {
        const { executor, state } = context;
        const currentStance = state.currentStance!;

        const casePrompt = await caseChallengeBuilders.challenge.build(
            state.conversationHistory,
            {
                topic: state.topic,
                currentStance: currentStance.position,
                currentReason: currentStance.reason,
                loopCount: state.loopCount.toString(),
            },
        );

        const message = (await executor.execute(casePrompt)) as string;

        return {
            message,
            newState: transitionTo(
                state,
                DialogueStage.CASE_CHALLENGE,
                SubState.MAIN,
            ),
            ended: false,
        };
    }

    /**
     * Handle transition to principle reasoning (Stage 3)
     */
    private async handleAdvanceToPrinciple(
        context: StageContext,
    ): Promise<StageResult> {
        const { executor, state } = context;
        const currentStance = state.currentStance!;

        const principlePrompt =
            await principleReasoningBuilders.reasoning.build(
                state.conversationHistory,
                {
                    topic: state.topic,
                    currentStance: currentStance.position,
                    currentReason: currentStance.reason,
                    stanceHistory: formatStanceHistory(state.stanceHistory),
                },
            );

        const message = (await executor.execute(principlePrompt)) as string;

        return {
            message,
            newState: {
                ...transitionTo(
                    state,
                    DialogueStage.PRINCIPLE_REASONING,
                    SubState.MAIN,
                ),
                loopCount: state.loopCount + 1,
            },
            ended: false,
        };
    }
}
