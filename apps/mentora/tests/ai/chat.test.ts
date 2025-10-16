import { describe, expect, it } from "vitest";
import { chat, z } from "../../src/lib/server/ai";

describe("chat", () => {
    it("should handle simple structured output", async () => {
        const schema = z.object({
            answer: z.number(),
            derivation: z.string(),
        });

        const result = await chat(
            {
                messages: [
                    {
                        role: "user",
                        content:
                            "What is the time complexity of binary search? Choose from 1. O(n), 2. O(log n), 3. O(n log n), 4. O(1).",
                    },
                ],
            },
            schema,
        );

        expect(result).toHaveProperty("answer");
        expect(result).toHaveProperty("derivation");
        expect(result.answer).toBe(2);
        expect(result.derivation.length).toBeGreaterThan(0);
    }, 30000);

    it("should handle multi-turn conversations", async () => {
        const schema = z.object({
            response: z.string(),
            context: z.string(),
        });

        const result = await chat(
            {
                messages: [
                    {
                        role: "user",
                        content: "My name is Alice.",
                    },
                    {
                        role: "assistant",
                        content: "Nice to meet you, Alice!",
                    },
                    {
                        role: "user",
                        content:
                            "What's my name? Include context about our conversation.",
                    },
                ],
            },
            schema,
        );

        expect(result).toHaveProperty("response");
        expect(result).toHaveProperty("context");
        expect(result.response.toLowerCase()).toContain("alice");
    }, 30000);
});
