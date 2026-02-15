import {
    TOTAL_CONVERSATION_STAGES,
    resolveConversationStage,
} from "$lib/features/conversation/stage";
import { describe, expect, it } from "vitest";

describe("conversation stage mapping", () => {
    it("returns the first stage for opening state", () => {
        expect(resolveConversationStage("awaiting_idea")).toBe(1);
    });

    it("returns the final stage for closed state", () => {
        expect(resolveConversationStage("closed")).toBe(
            TOTAL_CONVERSATION_STAGES,
        );
    });

    it("falls back to stage 1 for unknown states", () => {
        expect(resolveConversationStage("unknown_state")).toBe(1);
    });
});
