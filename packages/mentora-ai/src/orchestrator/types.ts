/**
 * Core types for the orchestrator module
 */
import type {
    DialogueStage,
    DialogueState,
    PrincipleVersion,
    StanceVersion,
} from "../builder/types.js";
import type { PromptExecutor, TokenUsage } from "../types.js";

/**
 * Result from processing a stage
 */
export interface StageResult {
    /** Response message to send to student */
    message: string;
    /** Updated dialogue state */
    newState: DialogueState;
    /** Whether the conversation has ended */
    ended: boolean;
    /** Token usage for this turn (all LLM calls in this processing step) */
    usage: TokenUsage;
}

// Re-export TokenUsage for convenience
export type { TokenUsage };

/**
 * Context passed to stage handlers
 */
export interface StageContext {
    /** The prompt executor for LLM calls */
    executor: PromptExecutor;
    /** Current dialogue state */
    state: DialogueState;
    /** Student's input message */
    studentMessage: string;
    /** Orchestrator configuration */
    config: Required<OrchestratorConfig>;
}

/**
 * Interface for stage handlers
 * Each stage implements this interface for consistent handling
 */
export interface StageHandler {
    /** The stage this handler processes */
    readonly stage: DialogueStage;

    /**
     * Handle student input for this stage
     * @param context - The stage context with state and input
     * @returns Result containing response and updated state
     */
    handle(context: StageContext): Promise<StageResult>;
}

/**
 * Registry for stage handlers
 */
export interface StageHandlerRegistry {
    /**
     * Register a handler for a stage
     */
    register(handler: StageHandler): void;

    /**
     * Get handler for a stage
     */
    get(stage: DialogueStage): StageHandler | undefined;

    /**
     * Check if a handler exists for a stage
     */
    has(stage: DialogueStage): boolean;
}

/**
 * Configuration for the orchestrator
 */
export interface OrchestratorConfig {
    /** Maximum number of Stage 2-3 loops before forcing closure */
    maxLoops?: number;
    /** Minimum loops before allowing closure */
    minLoopsForClosure?: number;
    /** Custom logging function */
    logger?: (message: string, ...args: unknown[]) => void;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<OrchestratorConfig> = {
    maxLoops: 5,
    minLoopsForClosure: 1,
    logger: () => {}, // No-op by default
};

// Re-export types from builder for convenience
export type { DialogueStage, DialogueState, PrincipleVersion, StanceVersion };
