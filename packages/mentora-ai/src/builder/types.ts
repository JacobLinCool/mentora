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
 * Sub-states within each stage
 */
export enum SubState {
    /** Main flow of the stage */
    MAIN = "main",
    /** Requesting clarification from student */
    CLARIFY = "clarify",
    /** Guiding student through stance/principle update */
    SCAFFOLD = "scaffold",
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
    /** Current sub-state within the stage */
    subState: SubState;
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
 * Actions that can be taken after analyzing student response
 */
export enum DecisionAction {
    // Stage 1 actions
    CLARIFY_STANCE = "clarify_stance",
    CONFIRM_STANCE = "confirm_stance",

    // Stage 2 actions
    CLARIFY_CASE_RESPONSE = "clarify_case_response",
    SCAFFOLD_STANCE_UPDATE = "scaffold_stance_update",
    CONTINUE_CASE_CHALLENGE = "continue_case_challenge",
    ADVANCE_TO_PRINCIPLE = "advance_to_principle",

    // Stage 3 actions
    CLARIFY_PRINCIPLE = "clarify_principle",
    SCAFFOLD_PRINCIPLE_UPDATE = "scaffold_principle_update",
    LOOP_TO_STAGE2 = "loop_to_stage2",
    ADVANCE_TO_CLOSURE = "advance_to_closure",

    // Stage 4 actions
    CLARIFY_SUMMARY = "clarify_summary",
    CONFIRM_END = "confirm_end",

    // Terminal actions
    END_CONVERSATION = "end_conversation",
    ABORT_CONVERSATION = "abort_conversation",
}

/**
 * Result from decision-making prompt
 */
export interface DecisionResult {
    /** The action to take */
    action: DecisionAction;
    /** Message to send to student */
    message: string;
    /** New or updated stance (if applicable) */
    newStance: StanceVersion | null;
    /** New or updated principle (if applicable) */
    newPrinciple: PrincipleVersion | null;
    /** Detected contradiction or issue (if applicable) */
    contradiction: string | null;
    /** Summary content (in closure stage) */
    summary: string | null;
    /** Reasoning for the decision */
    reasoning: string;
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
