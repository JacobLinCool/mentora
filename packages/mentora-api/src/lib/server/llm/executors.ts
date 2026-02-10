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

/**
 * Singleton instances for each executor type
 * Reused across requests for efficiency
 */
let promptExecutorInstance: PromptExecutor | null = null;
let asrExecutorInstance: ASRExecutor | null = null;
let contentExecutorInstance: ContentExecutor | null = null;
let ttsExecutorInstance: TTSExecutor | null = null;
let genaiInstance: GoogleGenAI | null = null;

/**
 * Get or create the shared GoogleGenAI client
 */
function getGenAIClient(): GoogleGenAI {
	if (genaiInstance) {
		return genaiInstance;
	}

	genaiInstance = new GoogleGenAI({});
	return genaiInstance;
}

/**
 * Get or create the GeminiPromptExecutor singleton
 *
 * Used for structured dialogue prompts with JSON schema validation.
 */
export function getPromptExecutor(): PromptExecutor {
	if (promptExecutorInstance) {
		return promptExecutorInstance;
	}

	const genai = getGenAIClient();
	promptExecutorInstance = new GeminiPromptExecutor(genai, 'gemini-3-flash-preview');

	return promptExecutorInstance;
}

/**
 * Get or create the GeminiASRExecutor singleton
 *
 * Used for transcribing audio to text in traditional Chinese.
 */
export function getASRExecutor(): ASRExecutor {
	if (asrExecutorInstance) {
		return asrExecutorInstance;
	}

	const genai = getGenAIClient();
	asrExecutorInstance = new GeminiASRExecutor(genai, 'gemini-2.5-flash');

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

	const genai = getGenAIClient();
	contentExecutorInstance = new GeminiContentExecutor(genai, 'gemini-2.5-flash');

	return contentExecutorInstance;
}

/**
 * Get or create the GeminiTTSExecutor singleton
 *
 * Used for synthesizing text to speech in traditional Chinese.
 */
export function getTTSExecutor(): TTSExecutor {
	if (ttsExecutorInstance) {
		return ttsExecutorInstance;
	}

	const genai = getGenAIClient();
	ttsExecutorInstance = new GeminiTTSExecutor(genai, 'gemini-2.5-flash');

	return ttsExecutorInstance;
}

/**
 * Reset all executor instances
 * Useful for testing or forcing re-initialization
 */
export function resetExecutors(): void {
	promptExecutorInstance = null;
	asrExecutorInstance = null;
	contentExecutorInstance = null;
	ttsExecutorInstance = null;
	genaiInstance = null;
}
