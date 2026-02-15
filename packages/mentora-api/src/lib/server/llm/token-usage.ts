import type { TokenUsage } from 'mentora-ai';

export const TOKEN_USAGE_FEATURES = {
	CONVERSATION_ASR: 'conversation_asr',
	CONVERSATION_LLM: 'conversation_llm',
	CONVERSATION_TTS: 'conversation_tts',
	ASSIGNMENT_CONTENT_GENERATION: 'assignment_content_generation'
} as const;

export type TokenUsageFeature = (typeof TOKEN_USAGE_FEATURES)[keyof typeof TOKEN_USAGE_FEATURES];

export interface TokenUsageTotals {
	cachedContentTokenCount: number;
	promptTokenCount: number;
	toolUsePromptTokenCount: number;
	thoughtsTokenCount: number;
	candidatesTokenCount: number;
	inputTokenCount: number;
	outputTokenCount: number;
	totalTokenCount: number;
}

export interface TokenUsageReport {
	byFeature: Record<string, TokenUsageTotals>;
	totals: TokenUsageTotals;
}

type TokenUsageLike = TokenUsageTotals | TokenUsage | null | undefined;

function toTokenCount(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return 0;
	}

	return Math.trunc(value);
}

function isTokenUsageTotals(value: unknown): value is TokenUsageTotals {
	if (!value || typeof value !== 'object') {
		return false;
	}

	return 'inputTokenCount' in value && 'outputTokenCount' in value && 'totalTokenCount' in value;
}

export function createEmptyTokenUsageTotals(): TokenUsageTotals {
	return {
		cachedContentTokenCount: 0,
		promptTokenCount: 0,
		toolUsePromptTokenCount: 0,
		thoughtsTokenCount: 0,
		candidatesTokenCount: 0,
		inputTokenCount: 0,
		outputTokenCount: 0,
		totalTokenCount: 0
	};
}

export function normalizeTokenUsage(usage: TokenUsageLike): TokenUsageTotals {
	if (!usage) {
		return createEmptyTokenUsageTotals();
	}

	if (isTokenUsageTotals(usage)) {
		return {
			cachedContentTokenCount: toTokenCount(usage.cachedContentTokenCount),
			promptTokenCount: toTokenCount(usage.promptTokenCount),
			toolUsePromptTokenCount: toTokenCount(usage.toolUsePromptTokenCount),
			thoughtsTokenCount: toTokenCount(usage.thoughtsTokenCount),
			candidatesTokenCount: toTokenCount(usage.candidatesTokenCount),
			inputTokenCount: toTokenCount(usage.inputTokenCount),
			outputTokenCount: toTokenCount(usage.outputTokenCount),
			totalTokenCount: toTokenCount(usage.totalTokenCount)
		};
	}

	const cachedContentTokenCount = toTokenCount(usage.cachedContentTokenCount);
	const promptTokenCount = toTokenCount(usage.promptTokenCount);
	const toolUsePromptTokenCount = toTokenCount(usage.toolUsePromptTokenCount);
	const thoughtsTokenCount = toTokenCount(usage.thoughtsTokenCount);
	const candidatesTokenCount = toTokenCount(usage.candidatesTokenCount);
	const inputTokenCount = cachedContentTokenCount + promptTokenCount + toolUsePromptTokenCount;
	const outputTokenCount = candidatesTokenCount;
	const derivedTotalTokenCount = inputTokenCount + outputTokenCount + thoughtsTokenCount;
	const totalTokenCount = Math.max(toTokenCount(usage.totalTokenCount), derivedTotalTokenCount);

	return {
		cachedContentTokenCount,
		promptTokenCount,
		toolUsePromptTokenCount,
		thoughtsTokenCount,
		candidatesTokenCount,
		inputTokenCount,
		outputTokenCount,
		totalTokenCount
	};
}

export function sumTokenUsageTotals(
	base: TokenUsageLike,
	addition: TokenUsageLike
): TokenUsageTotals {
	const normalizedBase = normalizeTokenUsage(base);
	const normalizedAddition = normalizeTokenUsage(addition);

	return {
		cachedContentTokenCount:
			normalizedBase.cachedContentTokenCount + normalizedAddition.cachedContentTokenCount,
		promptTokenCount: normalizedBase.promptTokenCount + normalizedAddition.promptTokenCount,
		toolUsePromptTokenCount:
			normalizedBase.toolUsePromptTokenCount + normalizedAddition.toolUsePromptTokenCount,
		thoughtsTokenCount: normalizedBase.thoughtsTokenCount + normalizedAddition.thoughtsTokenCount,
		candidatesTokenCount:
			normalizedBase.candidatesTokenCount + normalizedAddition.candidatesTokenCount,
		inputTokenCount: normalizedBase.inputTokenCount + normalizedAddition.inputTokenCount,
		outputTokenCount: normalizedBase.outputTokenCount + normalizedAddition.outputTokenCount,
		totalTokenCount: normalizedBase.totalTokenCount + normalizedAddition.totalTokenCount
	};
}

export function createTokenUsageReport(
	entries: Array<{ feature: string; usage: TokenUsageLike }>
): TokenUsageReport {
	const byFeature: Record<string, TokenUsageTotals> = {};
	let totals = createEmptyTokenUsageTotals();

	for (const entry of entries) {
		if (!entry.usage) {
			continue;
		}

		const normalizedUsage = normalizeTokenUsage(entry.usage);
		if (normalizedUsage.totalTokenCount <= 0) {
			continue;
		}

		byFeature[entry.feature] = sumTokenUsageTotals(byFeature[entry.feature], normalizedUsage);
		totals = sumTokenUsageTotals(totals, normalizedUsage);
	}

	return {
		byFeature,
		totals
	};
}

export function mergeTokenUsageReports(
	base: TokenUsageReport | null | undefined,
	addition: TokenUsageReport | null | undefined
): TokenUsageReport {
	const merged: TokenUsageReport = {
		byFeature: {},
		totals: createEmptyTokenUsageTotals()
	};

	const sources = [base, addition];
	for (const source of sources) {
		if (!source) {
			continue;
		}

		merged.totals = sumTokenUsageTotals(merged.totals, source.totals);

		for (const [feature, usage] of Object.entries(source.byFeature ?? {})) {
			merged.byFeature[feature] = sumTokenUsageTotals(merged.byFeature[feature], usage);
		}
	}

	return merged;
}
