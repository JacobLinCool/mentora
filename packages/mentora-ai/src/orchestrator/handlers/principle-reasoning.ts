/**
 * Stage 3: Principle Reasoning Handler
 */
import {
    caseChallengeBuilders,
    type CaseChallengeResponse,
} from "../../builder/stage2-case-challenge.js";
import {
    principleReasoningBuilders,
    type PrincipleReasoningClassifier,
    type PrincipleReasoningResponse,
} from "../../builder/stage3-principle-reasoning.js";
import {
    closureBuilders,
    type ClosureResponse,
} from "../../builder/stage4-closure.js";
import { DialogueStage } from "../../builder/types.js";
import { formatStageResponse } from "../format.js";
import {
    formatStanceHistory,
    transitionTo,
    updatePrinciple,
} from "../state.js";
import type { StageContext, StageHandler, StageResult } from "../types.js";

/**
 * Handler for Stage 3: Principle Reasoning
 *
 * Responsibilities:
 * - Analyze principle clarity and consistency
 * - Re-ask when unclear (TR_CLARIFY)
 * - Scaffold principle refinement (TR_SCAFFOLD)
 * - Loop back to Stage 2 if principle needs testing (TR_NEXT_CASE)
 * - Advance to Closure when principle is solid (TR_COMPLETE)
 */
export class PrincipleReasoningHandler implements StageHandler {
    readonly stage = DialogueStage.PRINCIPLE_REASONING;

    async handle(context: StageContext): Promise<StageResult> {
        const { executor, state, studentMessage } = context;
        const currentStance = state.currentStance!;

        // Step 1: Classify user input using Classifier
        const classifierPrompt =
            await principleReasoningBuilders.classifier.build(
                state.conversationHistory,
                {
                    currentStance: currentStance.position,
                    userInput: studentMessage,
                },
            );

        const classification = (await executor.execute(
            classifierPrompt,
        )) as PrincipleReasoningClassifier;

        // Step 2: Route based on detected intent
        switch (classification.detected_intent) {
            case "TR_CLARIFY":
                return this.handleClarify(context);

            case "TR_SCAFFOLD":
                return this.handleScaffold(context, studentMessage);

            case "TR_NEXT_CASE":
                return this.handleNextCase(context, classification);

            case "TR_COMPLETE":
                return this.handleComplete(context, classification);
        }
    }

    /**
     * Handle clarification for unclear principle (TR_CLARIFY)
     */
    private async handleClarify(context: StageContext): Promise<StageResult> {
        const { executor, state } = context;

        // Re-ask using the reasoning builder
        const clarifyPrompt = await principleReasoningBuilders.reasoning.build(
            state.conversationHistory,
            {
                discussionSummary: formatStanceHistory(state.stanceHistory),
            },
        );

        const response = (await executor.execute(
            clarifyPrompt,
        )) as PrincipleReasoningResponse;

        const message = formatStageResponse(response);

        return {
            message,
            newState: transitionTo(state, DialogueStage.PRINCIPLE_REASONING),
            ended: false,
            usage: executor.getTokenUsage(),
        };
    }

    /**
     * Handle scaffolding for principle refinement (TR_SCAFFOLD)
     */
    private async handleScaffold(
        context: StageContext,
        userPrinciple: string,
    ): Promise<StageResult> {
        const { executor, state } = context;

        const scaffoldPrompt = await principleReasoningBuilders.scaffold.build(
            state.conversationHistory,
            {
                userPrinciple,
                detectedTension: "Safety vs. Morality (or Logic Inconsistency)",
            },
        );

        const response = (await executor.execute(
            scaffoldPrompt,
        )) as PrincipleReasoningResponse;

        const message = formatStageResponse(response);

        return {
            message,
            newState: transitionTo(state, DialogueStage.PRINCIPLE_REASONING),
            ended: false,
            usage: executor.getTokenUsage(),
        };
    }

    /**
     * Handle next case - loop back to Stage 2 with new case (TR_NEXT_CASE)
     */
    private async handleNextCase(
        context: StageContext,
        classification: PrincipleReasoningClassifier,
    ): Promise<StageResult> {
        const { executor, state } = context;
        const currentStance = state.currentStance!;

        // Check if we've reached max loops
        if (state.loopCount >= context.config.maxLoops) {
            return this.handleComplete(context, classification);
        }

        // Save the principle before looping back
        let updatedState = { ...state };
        if (classification.extracted_data?.reasoning) {
            updatedState = updatePrinciple(
                updatedState,
                classification.extracted_data.reasoning,
                null,
            );
        }

        // Generate new case challenge
        const casePrompt = await caseChallengeBuilders.challenge.build(
            state.conversationHistory,
            {
                currentStance: currentStance.position,
                caseContent: "", // Will be generated by the model
            },
        );

        const response = (await executor.execute(
            casePrompt,
        )) as CaseChallengeResponse;

        const message = formatStageResponse(response);

        return {
            message,
            newState: {
                ...transitionTo(updatedState, DialogueStage.CASE_CHALLENGE),
                loopCount: state.loopCount + 1,
            },
            ended: false,
            usage: executor.getTokenUsage(),
        };
    }

    /**
     * Handle complete - advance to closure (TR_COMPLETE)
     */
    private async handleComplete(
        context: StageContext,
        classification: PrincipleReasoningClassifier,
    ): Promise<StageResult> {
        const { executor, state } = context;

        // Check if we haven't met min loops requirement
        if (state.loopCount < context.config.minLoopsForClosure) {
            return this.handleNextCase(context, classification);
        }

        // Save final principle
        let updatedState = { ...state };
        const finalPrinciple = classification.extracted_data?.reasoning || "";
        if (finalPrinciple) {
            updatedState = updatePrinciple(updatedState, finalPrinciple, null);
        }

        // Get stance evolution for summary
        const stanceV1 = state.stanceHistory[0]?.position || "";
        const stanceFinal = state.currentStance?.position || "";
        const keyReasoning = updatedState.currentPrinciple?.statement || "";

        // Generate closure summary
        const closurePrompt = await closureBuilders.summary.build(
            state.conversationHistory,
            {
                stanceV1,
                stanceFinal,
                keyReasoning,
            },
        );

        const response = (await executor.execute(
            closurePrompt,
        )) as ClosureResponse;

        const message = formatStageResponse(response);

        return {
            message,
            newState: {
                ...transitionTo(updatedState, DialogueStage.CLOSURE),
                summary: response.response_message,
                discussionSatisfied: true,
            },
            ended: false,
            usage: executor.getTokenUsage(),
        };
    }
}
