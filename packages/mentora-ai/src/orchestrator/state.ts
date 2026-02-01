/**
 * State management utilities for the orchestrator
 */
import type { Content } from "@google/genai";

import { DialogueStage, SubState } from "../builder/types.js";
import type {
    DialogueState,
    PrincipleVersion,
    StanceVersion,
} from "./types.js";

/**
 * Create initial dialogue state
 */
export function createInitialState(topic: string): DialogueState {
    return {
        topic,
        stage: DialogueStage.AWAITING_START,
        subState: SubState.MAIN,
        loopCount: 0,
        stanceHistory: [],
        currentStance: null,
        principleHistory: [],
        currentPrinciple: null,
        conversationHistory: [],
        summary: null,
        discussionSatisfied: false,
    };
}

/**
 * Create a new stance version
 */
export function createStanceVersion(
    position: string,
    reason: string,
    version: number,
): StanceVersion {
    return {
        version,
        position,
        reason,
        establishedAt: Date.now(),
    };
}

/**
 * Create a new principle version
 */
export function createPrincipleVersion(
    statement: string,
    classification: string | null,
    version: number,
): PrincipleVersion {
    return {
        version,
        statement,
        classification,
        establishedAt: Date.now(),
    };
}

/**
 * Add a message to conversation history
 */
export function addToHistory(
    state: DialogueState,
    role: "user" | "model",
    text: string,
): DialogueState {
    return {
        ...state,
        conversationHistory: [
            ...state.conversationHistory,
            { role, parts: [{ text }] } as Content,
        ],
    };
}

/**
 * Update stance in state
 */
export function updateStance(
    state: DialogueState,
    position: string,
    reason: string,
): DialogueState {
    const newStance = createStanceVersion(
        position,
        reason,
        state.stanceHistory.length + 1,
    );
    return {
        ...state,
        currentStance: newStance,
        stanceHistory: [...state.stanceHistory, newStance],
    };
}

/**
 * Update principle in state
 */
export function updatePrinciple(
    state: DialogueState,
    statement: string,
    classification: string | null,
): DialogueState {
    const newPrinciple = createPrincipleVersion(
        statement,
        classification,
        state.principleHistory.length + 1,
    );
    return {
        ...state,
        currentPrinciple: newPrinciple,
        principleHistory: [...state.principleHistory, newPrinciple],
    };
}

/**
 * Transition to a new stage
 */
export function transitionTo(
    state: DialogueState,
    stage: DialogueStage,
    subState: SubState = SubState.MAIN,
): DialogueState {
    return {
        ...state,
        stage,
        subState,
    };
}

/**
 * Format stance history as a string for prompts
 */
export function formatStanceHistory(history: StanceVersion[]): string {
    if (history.length === 0) return "無先前立場記錄";

    return history
        .map((s) => `V${s.version}: ${s.position} (理由: ${s.reason})`)
        .join("\n");
}

/**
 * Format principle history as a string for prompts
 */
export function formatPrincipleHistory(history: PrincipleVersion[]): string {
    if (history.length === 0) return "無先前原則記錄";

    return history
        .map(
            (p) =>
                `V${p.version}: ${p.statement}${p.classification ? ` (${p.classification})` : ""}`,
        )
        .join("\n");
}
