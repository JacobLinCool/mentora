import { describe, expect, it } from "vitest";
import { formatStageResponse } from "../src/orchestrator/format.js";

describe("formatStageResponse", () => {
    it("combines response_message and concise_question with blank line", () => {
        const result = formatStageResponse({
            response_message: "Here is the main message.",
            concise_question: "What do you think?",
        });
        expect(result).toBe("Here is the main message.\n\nWhat do you think?");
    });

    it("handles empty strings", () => {
        const result = formatStageResponse({
            response_message: "",
            concise_question: "",
        });
        expect(result).toBe("\n\n");
    });

    it("preserves multi-line content", () => {
        const result = formatStageResponse({
            response_message: "Line 1\nLine 2",
            concise_question: "Question?",
        });
        expect(result).toBe("Line 1\nLine 2\n\nQuestion?");
    });
});
