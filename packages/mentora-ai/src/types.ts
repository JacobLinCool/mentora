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
 * Token usage information for the current turn
 * Matches Gemini API's GenerateContentResponseUsageMetadata structure
 */
export interface TokenUsage {
    /** The number of tokens in the cached content that was used for this request */
    cachedContentTokenCount?: number;
    /** The total number of tokens in the generated candidates */
    candidatesTokenCount?: number;
    /** The total number of tokens in the prompt (includes text, images, or other media) */
    promptTokenCount?: number;
    /** The number of tokens that were part of the model's generated "thoughts" output */
    thoughtsTokenCount?: number;
    /** The number of tokens in the results from tool executions */
    toolUsePromptTokenCount?: number;
    /** The total number of tokens for the entire request */
    totalTokenCount?: number;
}

/**
 * A prompt with contents and optional schema for structured output
 */
export interface Prompt<T> {
    systemInstruction?: string;
    contents: Content[];
    schema: ZodType<T> | null;
}

/**
 * Builder interface for creating prompts
 */
export interface PromptBuilder<
    I extends Record<string, string>,
    O extends Record<string, JsonValue> | null,
> {
    build(contents: Content[], input: I): Promise<Prompt<O>>;
}

/**
 * Executor interface for running prompts against an LLM
 */
/**
 * Interface for components that track token usage
 */
export interface TokenTracker {
    /**
     * Get the token usage for the current turn
     * Returns accumulated usage since last reset
     */
    getTokenUsage(): TokenUsage;

    /**
     * Reset the token usage counter for a new turn
     */
    resetTokenUsage(): void;
}

/**
 * Executor interface for running prompts against an LLM
 */
export interface PromptExecutor extends TokenTracker {
    /**
     * Execute a prompt and return the response
     */
    execute<O extends Record<string, JsonValue> | null>(
        prompt: Prompt<O>,
    ): Promise<O extends null ? string : O>;
}

/**
 * Executor interface for running ASR (Automatic Speech Recognition) tasks
 */
export interface ASRExecutor extends TokenTracker {
    /**
     * Transcribe audio content
     * @param audioBase64 - Base64 encoded audio string
     * @param mimeType - MIME type of the audio (default: audio/mp3)
     * @returns Transcribed text
     */
    transcribe(audioBase64: string, mimeType?: string): Promise<string>;
}

/**
 * Executor interface for generating reference content based on a question to guild student's answer
 */
export interface ContentExecutor extends TokenTracker {
    /**
     * Generate reference content based on a question to guide student's answer
     * @param question - The question or prompt to generate reference content for
     * @returns Generated reference content as a string
     */
    generateContent(question: string): Promise<string>;
}

/**
 * Executor interface for running TTS (Text-to-Speech) tasks
 */
export interface TTSExecutor extends TokenTracker {
    /**
     * Synthesize text to speech
     * @param text - Text to synthesize
     * @returns Base64 encoded audio string
     */
    synthesize(text: string): Promise<string>;
}
