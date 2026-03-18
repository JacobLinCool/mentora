/**
 * Gemini model pricing table (USD per million tokens)
 * Maintain as code constants — no database needed.
 */

export interface ModelPricing {
	model: string;
	inputPricePerMillionTokens: number;
	outputPricePerMillionTokens: number;
}

/**
 * Pricing for models currently used by Mentora.
 * Key = value from EXECUTOR_MODEL in executors.ts
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
	'gemini-3-flash-preview': {
		model: 'gemini-3-flash-preview',
		inputPricePerMillionTokens: 0.15,
		outputPricePerMillionTokens: 0.6
	},
	'gemini-2.5-flash': {
		model: 'gemini-2.5-flash',
		inputPricePerMillionTokens: 0.15,
		outputPricePerMillionTokens: 0.6
	},
	'gemini-2.5-flash-preview-tts': {
		model: 'gemini-2.5-flash-preview-tts',
		inputPricePerMillionTokens: 0.15,
		outputPricePerMillionTokens: 0.6
	}
};

const FALLBACK_PRICING: ModelPricing = {
	model: 'unknown',
	inputPricePerMillionTokens: 0.15,
	outputPricePerMillionTokens: 0.6
};

/**
 * Calculate USD cost from token counts for a single model.
 */
export function calculateTokenCostUsd(
	model: string,
	inputTokens: number,
	outputTokens: number
): number {
	const pricing = MODEL_PRICING[model] ?? FALLBACK_PRICING;
	const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillionTokens;
	const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillionTokens;
	return inputCost + outputCost;
}

/**
 * Calculate total USD cost from a token usage report with model info.
 * `models` maps feature names to model names (from EXECUTOR_MODEL).
 */
export function calculateReportCostUsd(
	byFeature: Record<string, { inputTokenCount: number; outputTokenCount: number }>,
	models: Record<string, string>
): number {
	let total = 0;
	for (const [feature, usage] of Object.entries(byFeature)) {
		const model = models[feature] ?? 'unknown';
		total += calculateTokenCostUsd(model, usage.inputTokenCount, usage.outputTokenCount);
	}
	return total;
}
