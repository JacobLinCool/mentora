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
	type PromptExecutor,
	type ASRExecutor,
	type ContentExecutor
} from 'mentora-ai';

/**
 * Singleton instances for each executor type
 * Reused across requests for efficiency
 */
let promptExecutorInstance: PromptExecutor | null = null;
let asrExecutorInstance: ASRExecutor | null = null;
let contentExecutorInstance: ContentExecutor | null = null;
let genaiInstance: GoogleGenAI | null = null;

/**
 * Get or create the shared GoogleGenAI client
 *
 * @throws Error if GOOGLE_GENAI_API_KEY is not configured
 */
function getGenAIClient(): GoogleGenAI {
	if (genaiInstance) {
		return genaiInstance;
	}

	const apiKey = process.env.GOOGLE_GENAI_API_KEY;
	if (!apiKey) {
		throw new Error(
			'GOOGLE_GENAI_API_KEY environment variable not set. ' +
				'Please configure it in your .env.local file.'
		);
	}

	genaiInstance = new GoogleGenAI({ apiKey });
	return genaiInstance;
}

/**
 * Get or create the GeminiPromptExecutor singleton
 *
 * Used for structured dialogue prompts with JSON schema validation.
 *
 * @throws Error if GOOGLE_GENAI_API_KEY is not configured
 */
export function getPromptExecutor(): PromptExecutor {
	if (promptExecutorInstance) {
		return promptExecutorInstance;
	}
	if (!process.env.GOOGLE_GENAI_MODEL) {
		throw new Error(
			'GOOGLE_GENAI_MODEL environment variable not set. ' +
				'Please configure it in your .env.local file.'
		);
	}

	const genai = getGenAIClient();
	promptExecutorInstance = new GeminiPromptExecutor(genai, process.env.GOOGLE_GENAI_MODEL);

	return promptExecutorInstance;
}

/**
 * Get or create the GeminiASRExecutor singleton
 *
 * Used for transcribing audio to text in traditional Chinese.
 *
 * @throws Error if GOOGLE_GENAI_API_KEY is not configured
 */
export function getASRExecutor(): ASRExecutor {
	if (asrExecutorInstance) {
		return asrExecutorInstance;
	}
	if (!process.env.GOOGLE_GENAI_MODEL) {
		throw new Error(
			'GOOGLE_GENAI_MODEL environment variable not set. ' +
				'Please configure it in your .env.local file.'
		);
	}

	const genai = getGenAIClient();
	asrExecutorInstance = new GeminiASRExecutor(genai, 'gemini-2.0-flash');

	return asrExecutorInstance;
}

/**
 * Get or create the GeminiContentExecutor singleton
 *
 * Used for generating educational reference content from questions.
 * Includes Google Search retrieval for up-to-date information.
 *
 * @throws Error if GOOGLE_GENAI_API_KEY is not configured
 */
export function getContentExecutor(): ContentExecutor {
	if (contentExecutorInstance) {
		return contentExecutorInstance;
	}
	if (!process.env.GOOGLE_GENAI_MODEL) {
		throw new Error(
			'GOOGLE_GENAI_MODEL environment variable not set. ' +
				'Please configure it in your .env.local file.'
		);
	}

	const genai = getGenAIClient();
	contentExecutorInstance = new GeminiContentExecutor(genai, process.env.GOOGLE_GENAI_MODEL);

	return contentExecutorInstance;
}

/**
 * Reset all executor instances
 * Useful for testing or forcing re-initialization
 */
export function resetExecutors(): void {
	promptExecutorInstance = null;
	asrExecutorInstance = null;
	contentExecutorInstance = null;
	genaiInstance = null;
}
