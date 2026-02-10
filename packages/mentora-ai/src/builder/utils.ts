import type { Content } from "@google/genai";

/**
 * Helper to ensure contents array has proper alternation
 * Gemini requires last message must be from "user"
 */
export function buildContents(contents: Content[]): Content[] {
    if (
        contents.length === 0 ||
        contents[contents.length - 1].role !== "user"
    ) {
        return [
            ...contents,
            { role: "user", parts: [{ text: "[please start]" }] },
        ];
    }
    return contents;
}
