/**
 * Main Mentora Orchestrator
 *
 * Manages the dialogue pipeline by delegating to stage handlers
 * and managing state transitions.
 */
import { askingStanceBuilders } from "../builder/stage1-asking-stance.js";
import { DialogueStage } from "../builder/types.js";
import type { PromptExecutor } from "../types.js";
import {
    AskingStanceHandler,
    CaseChallengeHandler,
    ClosureHandler,
    PrincipleReasoningHandler,
} from "./handlers/index.js";
import { DefaultStageHandlerRegistry } from "./registry.js";
import { addToHistory, createInitialState } from "./state.js";
import type {
    DialogueState,
    OrchestratorConfig,
    StageContext,
    StageHandler,
    StageHandlerRegistry,
    StageResult,
} from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

/**
 * Main orchestrator for the Mentora dialogue system
 *
 * @example
 * ```typescript
 * const orchestrator = new MentoraOrchestrator(executor);
 *
 * // Initialize
 * let state = orchestrator.initializeSession("討論主題");
 *
 * // Start conversation
 * const start = await orchestrator.startConversation(state);
 * state = start.newState;
 *
 * // Process student input
 * const response = await orchestrator.processStudentInput(state, "學生回應");
 * state = response.newState;
 * ```
 */
export class MentoraOrchestrator {
    private readonly config: Required<OrchestratorConfig>;
    private readonly registry: StageHandlerRegistry;

    constructor(
        private readonly executor: PromptExecutor,
        config: OrchestratorConfig = {},
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.registry = new DefaultStageHandlerRegistry();
        this.registerDefaultHandlers();
    }

    /**
     * Register the default stage handlers
     */
    private registerDefaultHandlers(): void {
        this.registry.register(new AskingStanceHandler());
        this.registry.register(new CaseChallengeHandler());
        this.registry.register(new PrincipleReasoningHandler());
        this.registry.register(new ClosureHandler());
    }

    /**
     * Register a custom stage handler
     * Allows extending or overriding default behavior
     */
    registerHandler(handler: StageHandler): void {
        this.registry.register(handler);
    }

    /**
     * Initialize a new dialogue session
     */
    initializeSession(topic: string): DialogueState {
        this.log("Initializing session for topic:", topic);
        return createInitialState(topic);
    }

    /**
     * Start the conversation by generating the initial stance question
     */
    async startConversation(
        state: DialogueState,
        topicContext: string = "",
    ): Promise<StageResult> {
        this.log("Starting conversation");

        const prompt = await askingStanceBuilders.initial.build([], {
            topic: state.topic,
            topicContext,
        });

        const message = (await this.executor.execute(prompt)) as string;

        const newState = addToHistory(
            {
                ...state,
                stage: DialogueStage.ASKING_STANCE,
            },
            "model",
            message,
        );

        return {
            message,
            newState,
            ended: false,
        };
    }

    /**
     * Process student input and generate AI response
     */
    async processStudentInput(
        state: DialogueState,
        studentMessage: string,
        topicContext: string = "",
    ): Promise<StageResult> {
        this.log(`Processing input for stage: ${state.stage}`);

        // Add student message to history
        const stateWithMessage = addToHistory(state, "user", studentMessage);

        // Get handler for current stage
        const handler = this.registry.get(state.stage);
        if (!handler) {
            throw new Error(`No handler registered for stage: ${state.stage}`);
        }

        // Create context and execute handler
        const context: StageContext = {
            executor: this.executor,
            state: stateWithMessage,
            studentMessage,
            topicContext,
        };

        const result = await handler.handle(context);

        // Add AI response to history
        const finalState = addToHistory(
            result.newState,
            "model",
            result.message,
        );

        this.log(
            `Stage result - ended: ${result.ended}, new stage: ${finalState.stage}`,
        );

        return {
            ...result,
            newState: finalState,
        };
    }

    /**
     * Get the current stage of a dialogue state
     */
    getCurrentStage(state: DialogueState): DialogueStage {
        return state.stage;
    }

    /**
     * Check if dialogue has ended
     */
    isEnded(state: DialogueState): boolean {
        return (
            state.stage === DialogueStage.ENDED ||
            state.stage === DialogueStage.ABORTED
        );
    }

    /**
     * Abort the conversation
     */
    abort(state: DialogueState): DialogueState {
        this.log("Aborting conversation");
        return {
            ...state,
            stage: DialogueStage.ABORTED,
        };
    }

    /**
     * Log helper
     */
    private log(message: string, ...args: unknown[]): void {
        this.config.logger(`[MentoraOrchestrator] ${message}`, ...args);
    }
}

// Re-export for convenience
export { createInitialState } from "./state.js";
