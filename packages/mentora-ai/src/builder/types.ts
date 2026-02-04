import type { Content } from "@google/genai";

/**
 * Dialogue stages representing the main phases of the Mentora conversation
 */
export enum DialogueStage {
    /** Initial stage - waiting to start conversation */
    AWAITING_START = "awaiting_start",
    /** Stage 1: Establish student's initial stance (V1) */
    ASKING_STANCE = "asking_stance",
    /** Stage 2: Challenge stance with case scenarios */
    CASE_CHALLENGE = "case_challenge",
    /** Stage 3: Extract and refine underlying principles */
    PRINCIPLE_REASONING = "principle_reasoning",
    /** Stage 4: Summarize and confirm final position */
    CLOSURE = "closure",
    /** Conversation has ended */
    ENDED = "ended",
    /** Conversation was aborted */
    ABORTED = "aborted",
}

/**
 * Represents a versioned stance in the dialogue
 */
export interface StanceVersion {
    /** Version number (V1, V2, V3...) */
    version: number;
    /** The stance position itself */
    position: string;
    /** Reasoning behind the stance */
    reason: string;
    /** Timestamp when this stance was established */
    establishedAt: number;
}

/**
 * Represents a principle derived from the student's reasoning
 */
export interface PrincipleVersion {
    /** Version number */
    version: number;
    /** The principle statement */
    statement: string;
    /** Classification (e.g., "consequentialist", "deontological", etc.) */
    classification: string | null;
    /** Timestamp when this principle was established */
    establishedAt: number;
}

/**
 * Complete state of the dialogue at any point
 */
export interface DialogueState {
    /** The topic/question being discussed */
    topic: string;
    /** Current main stage */
    stage: DialogueStage;
    /** Number of iterations through the core loop */
    loopCount: number;
    /** History of stance versions */
    stanceHistory: StanceVersion[];
    /** Current stance (latest version) */
    currentStance: StanceVersion | null;
    /** History of principle versions */
    principleHistory: PrincipleVersion[];
    /** Current principle (latest version) */
    currentPrinciple: PrincipleVersion | null;
    /** Conversation history for context */
    conversationHistory: Content[];
    /** Generated summary (in closure stage) */
    summary: string | null;
    /** Whether discussion parameters are satisfied for closure */
    discussionSatisfied: boolean;
}

/**
 * Input context for prompt builders
 */
export interface BuilderInput {
    /** Current dialogue state */
    state: DialogueState;
    /** Latest student message */
    studentMessage: string;
    /** Assignment/topic context */
    topicContext: string;
}
