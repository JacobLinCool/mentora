import type { Content } from "@google/genai";
import type { ZodType } from "zod";

/**
 * JSON-compatible value type for structured outputs
 */
export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

/**
 * A prompt with contents and optional schema for structured output
 */
export interface Prompt<T> {
    contents: Content[];
    schema: ZodType<T> | null;
}

/**
 * Builder interface for creating prompts
 */
export interface PromptBuilder {
    build<
        I extends Record<string, string>,
        O extends Record<string, JsonValue> | null,
    >(
        contents: Content[],
        input: I,
    ): Promise<Prompt<O>>;
}

/**
 * Executor interface for running prompts against an LLM
 */
export interface PromptExecutor {
    execute<O extends Record<string, JsonValue> | null>(
        prompt: Prompt<O>,
    ): Promise<O extends null ? string : O>;
}
