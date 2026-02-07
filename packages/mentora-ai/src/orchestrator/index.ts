/**
 * Mentora Orchestrator Module
 *
 * Provides the core orchestration logic for the Mentora dialogue system.
 */

// Main orchestrator
export { MentoraOrchestrator, createInitialState } from "./orchestrator.js";

// Types
export { DEFAULT_CONFIG } from "./types.js";
export type {
    DialogueStage,
    DialogueState,
    OrchestratorConfig,
    PrincipleVersion,
    StageContext,
    StageHandler,
    StageHandlerRegistry,
    StageResult,
    StanceVersion,
} from "./types.js";

// Registry
export { DefaultStageHandlerRegistry } from "./registry.js";

// State utilities
export {
    addToHistory,
    createPrincipleVersion,
    createStanceVersion,
    formatPrincipleHistory,
    formatStanceHistory,
    transitionTo,
    updatePrinciple,
    updateStance,
} from "./state.js";

// Stage handlers (for custom usage/extension)
export {
    AskingStanceHandler,
    CaseChallengeHandler,
    ClosureHandler,
    PrincipleReasoningHandler,
} from "./handlers/index.js";
