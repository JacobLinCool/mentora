/**
 * AI Executors Service
 *
 * Centralized factory for creating and managing AI executor instances:
 * - GeminiPromptExecutor: for structured dialogue prompts
 * - GeminiASRExecutor: for audio transcription
 * - GeminiContentExecutor: for content generation (teacher tools)
 *
 * All executors share the same Google GenAI client and API key.
 */

import { GoogleGenAI } from '@google/genai';
import {
	GeminiPromptExecutor,
	GeminiASRExecutor,
	GeminiContentExecutor,
	GeminiTTSExecutor,
	type PromptExecutor,
	type ASRExecutor,
	type ContentExecutor,
	type TTSExecutor
} from 'mentora-ai';

export const EXECUTOR_MODEL = {
	PROMPT: 'gemini-3-flash-preview',
	ASR: 'gemini-2.5-flash',
	CONTENT: 'gemini-2.5-flash',
	TTS: 'gemini-2.5-flash-preview-tts'
} as const;

/**
 * Singleton GoogleGenAI client (stateless, safe to share across requests)
 */
let genaiInstance: GoogleGenAI | null = null;

/**
 * Get or create the shared GoogleGenAI client
 *
 * When apiKey is provided, returns a fresh instance (no singleton)
 * so each course can use its own Gemini API key.
 */
export function getGenAIClient(apiKey?: string): GoogleGenAI {
	if (apiKey) {
		return new GoogleGenAI({ apiKey });
	}

	if (genaiInstance) {
		return genaiInstance;
	}

	genaiInstance = new GoogleGenAI({});
	return genaiInstance;
}

/**
 * Create a new GeminiPromptExecutor instance
 *
 * Returns a fresh instance per call to avoid shared mutable token usage state
 * across concurrent requests (BaseTokenTracker is not thread-safe).
 */
export function getPromptExecutor(apiKey?: string): PromptExecutor {
	const genai = getGenAIClient(apiKey);
	return new GeminiPromptExecutor(genai, EXECUTOR_MODEL.PROMPT);
}

/**
 * Create a new GeminiASRExecutor instance
 *
 * Returns a fresh instance per call to avoid shared mutable token usage state
 * across concurrent requests (BaseTokenTracker is not thread-safe).
 */
export function getASRExecutor(apiKey?: string): ASRExecutor {
	const genai = getGenAIClient(apiKey);
	return new GeminiASRExecutor(genai, EXECUTOR_MODEL.ASR);
}

/**
 * Create a new GeminiContentExecutor instance
 *
 * Returns a fresh instance per call to avoid shared mutable token usage state
 * across concurrent requests (BaseTokenTracker is not thread-safe).
 */
export function getContentExecutor(apiKey?: string): ContentExecutor {
	const genai = getGenAIClient(apiKey);
	return new GeminiContentExecutor(genai, EXECUTOR_MODEL.CONTENT);
}

/**
 * Create a new GeminiTTSExecutor instance
 *
 * Returns a fresh instance per call to avoid shared mutable token usage state
 * across concurrent requests (BaseTokenTracker is not thread-safe).
 */
export function getTTSExecutor(apiKey?: string): TTSExecutor {
	const genai = getGenAIClient(apiKey);
	return new GeminiTTSExecutor(genai, EXECUTOR_MODEL.TTS);
}

/**
 * Reset the shared GoogleGenAI client
 * Useful for testing or forcing re-initialization
 */
export function resetExecutors(): void {
	genaiInstance = null;
}
