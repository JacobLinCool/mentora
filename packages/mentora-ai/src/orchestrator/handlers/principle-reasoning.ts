/**
 * Stage 3: Principle Reasoning Handler
 */
import { caseChallengeBuilders } from "../../builder/stage2-case-challenge.js";
import {
    principleReasoningBuilders,
    type PrincipleReasoningDecision,
} from "../../builder/stage3-principle-reasoning.js";
import { closureBuilders } from "../../builder/stage4-closure.js";
import { DialogueStage, SubState } from "../../builder/types.js";
import {
    createPrincipleVersion,
    formatPrincipleHistory,
    formatStanceHistory,
    transitionTo,
} from "../state.js";
import type { StageContext, StageHandler, StageResult } from "../types.js";

/**
 * Handler for Stage 3: Principle Reasoning
 *
 * Responsibilities:
 * - Guide principle extraction from stance
 * - Analyze principle clarity and consistency
 * - Scaffold principle refinement
 * - Loop back to Stage 2 if principle needs testing
 * - Advance to Closure when principle is solid
 */
export class PrincipleReasoningHandler implements StageHandler {
    readonly stage = DialogueStage.PRINCIPLE_REASONING;

    async handle(context: StageContext): Promise<StageResult> {
        const { executor, state, studentMessage } = context;
        const currentStance = state.currentStance!;

        // Analyze student's principle articulation
        const analyzerPrompt = await principleReasoningBuilders.analyzer.build(
            state.conversationHistory,
            {
                topic: state.topic,
                currentStance: currentStance.position,
                studentMessage,
                loopCount: state.loopCount.toString(),
            },
        );

        const decision = (await executor.execute(
            analyzerPrompt,
        )) as PrincipleReasoningDecision;

        switch (decision.action) {
            case "clarify":
                return this.handleClarify(context, studentMessage);

            case "scaffold":
                return this.handleScaffold(context, decision);

            case "loop_to_stage2":
                return this.handleLoopToStage2(context, decision);

            case "advance_to_closure":
                return this.handleAdvanceToClosure(context, decision);

            default:
                return {
                    message: decision.message,
                    newState: state,
                    ended: false,
                };
        }
    }

    /**
     * Handle clarification for unclear principle
     */
    private async handleClarify(
        context: StageContext,
        studentMessage: string,
    ): Promise<StageResult> {
        const { executor, state } = context;

        const clarifyPrompt = await principleReasoningBuilders.clarify.build(
            state.conversationHistory,
            {
                topic: state.topic,
                unclearPrinciple: studentMessage,
            },
        );

        const message = (await executor.execute(clarifyPrompt)) as string;

        return {
            message,
            newState: transitionTo(
                state,
                DialogueStage.PRINCIPLE_REASONING,
                SubState.CLARIFY,
            ),
            ended: false,
        };
    }

    /**
     * Handle scaffolding for principle refinement
     */
    private async handleScaffold(
        context: StageContext,
        decision: PrincipleReasoningDecision,
    ): Promise<StageResult> {
        const { executor, state, studentMessage } = context;

        const scaffoldPrompt = await principleReasoningBuilders.scaffold.build(
            state.conversationHistory,
            {
                topic: state.topic,
                originalPrinciple:
                    state.currentPrinciple?.statement || studentMessage,
                tensionIdentified: decision.principleChallenge || "",
                studentResponse: studentMessage,
            },
        );

        const message = (await executor.execute(scaffoldPrompt)) as string;

        // Update principle if identified
        let newState = transitionTo(
            state,
            DialogueStage.PRINCIPLE_REASONING,
            SubState.SCAFFOLD,
        );

        if (decision.principleIdentified && decision.principle) {
            const newPrinciple = createPrincipleVersion(
                decision.principle,
                decision.principleClassification,
                state.principleHistory.length + 1,
            );
            newState = {
                ...newState,
                currentPrinciple: newPrinciple,
                principleHistory: [...state.principleHistory, newPrinciple],
            };
        }

        return {
            message,
            newState,
            ended: false,
        };
    }

    /**
     * Handle loop back to Stage 2 for more case challenges
     */
    private async handleLoopToStage2(
        context: StageContext,
        decision: PrincipleReasoningDecision,
    ): Promise<StageResult> {
        const { executor, state } = context;
        const currentStance = state.currentStance!;

        // Generate a new case challenge that tests the problematic principle
        const casePrompt = await caseChallengeBuilders.challenge.build(
            state.conversationHistory,
            {
                topic: state.topic,
                currentStance: currentStance.position,
                currentReason: currentStance.reason,
                loopCount: state.loopCount.toString(),
                previousCases: decision.principleChallenge || "",
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
     * Handle advancement to closure (Stage 4)
     */
    private async handleAdvanceToClosure(
        context: StageContext,
        decision: PrincipleReasoningDecision,
    ): Promise<StageResult> {
        const { executor, state } = context;

        // Save principle if identified
        let newState = { ...state };
        if (decision.principleIdentified && decision.principle) {
            const finalPrinciple = createPrincipleVersion(
                decision.principle,
                decision.principleClassification,
                state.principleHistory.length + 1,
            );
            newState = {
                ...newState,
                currentPrinciple: finalPrinciple,
                principleHistory: [...state.principleHistory, finalPrinciple],
            };
        }

        // Generate summary
        const closurePrompt = await closureBuilders.summary.build(
            state.conversationHistory,
            {
                topic: state.topic,
                stanceHistory: formatStanceHistory(newState.stanceHistory),
                finalStance: newState.currentStance?.position || "",
                finalReason: newState.currentStance?.reason || "",
                principleHistory: formatPrincipleHistory(
                    newState.principleHistory,
                ),
                finalPrinciple: newState.currentPrinciple?.statement || "",
            },
        );

        const message = (await executor.execute(closurePrompt)) as string;

        return {
            message,
            newState: {
                ...transitionTo(newState, DialogueStage.CLOSURE, SubState.MAIN),
                discussionSatisfied: true,
            },
            ended: false,
        };
    }
}
