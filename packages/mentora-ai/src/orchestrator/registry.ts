/**
 * Stage handler registry implementation
 */
import { DialogueStage } from "../builder/types.js";
import type { StageHandler, StageHandlerRegistry } from "./types.js";

/**
 * Default implementation of the stage handler registry
 */
export class DefaultStageHandlerRegistry implements StageHandlerRegistry {
    private handlers = new Map<DialogueStage, StageHandler>();

    register(handler: StageHandler): void {
        if (this.handlers.has(handler.stage)) {
            throw new Error(
                `Handler already registered for stage: ${handler.stage}`,
            );
        }
        this.handlers.set(handler.stage, handler);
    }

    get(stage: DialogueStage): StageHandler | undefined {
        return this.handlers.get(stage);
    }

    has(stage: DialogueStage): boolean {
        return this.handlers.has(stage);
    }

    /**
     * Get all registered stages
     */
    getRegisteredStages(): DialogueStage[] {
        return Array.from(this.handlers.keys());
    }
}
