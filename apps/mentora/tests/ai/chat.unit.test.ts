import { beforeEach, describe, expect, it, vi } from "vitest";
import { chat } from "../../src/lib/server/ai/chat";
import { ai, z } from "../../src/lib/server/ai/shared";

type ChatCompletionResponse = Awaited<
    ReturnType<typeof ai.openai.chat.completions.create>
>;

describe("chat (unit)", () => {
    const schema = z.object({
        answer: z.number(),
    });

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("parses valid structured output", async () => {
        vi.spyOn(ai.openai.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({ answer: 2 }),
                    },
                },
            ],
        } as unknown as ChatCompletionResponse);

        await expect(
            chat(
                {
                    messages: [{ role: "user", content: "test" }],
                },
                schema,
            ),
        ).resolves.toEqual({ answer: 2 });
    });

    it("throws a deterministic error on malformed JSON payload", async () => {
        vi.spyOn(ai.openai.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {
                        content: "{invalid-json",
                    },
                },
            ],
        } as unknown as ChatCompletionResponse);

        await expect(
            chat(
                {
                    messages: [{ role: "user", content: "test" }],
                },
                schema,
            ),
        ).rejects.toThrow("Failed to parse chat completion JSON payload");
    });

    it("throws when model refuses", async () => {
        vi.spyOn(ai.openai.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {
                        refusal: "policy",
                    },
                },
            ],
        } as unknown as ChatCompletionResponse);

        await expect(
            chat(
                {
                    messages: [{ role: "user", content: "test" }],
                },
                schema,
            ),
        ).rejects.toThrow("Chat completion refused: policy");
    });

    it("throws when content is missing", async () => {
        vi.spyOn(ai.openai.chat.completions, "create").mockResolvedValue({
            choices: [
                {
                    message: {},
                },
            ],
        } as unknown as ChatCompletionResponse);

        await expect(
            chat(
                {
                    messages: [{ role: "user", content: "test" }],
                },
                schema,
            ),
        ).rejects.toThrow("No chat content received");
    });
});
