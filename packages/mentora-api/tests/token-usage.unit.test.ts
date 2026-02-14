import { describe, expect, it } from 'vitest';
import {
	createEmptyTokenUsageTotals,
	createTokenUsageReport,
	mergeTokenUsageReports,
	normalizeTokenUsage,
	sumTokenUsageTotals
} from '../src/lib/server/llm/token-usage.js';

describe('token-usage utilities', () => {
	it('normalizes raw provider token usage into derived counters', () => {
		const normalized = normalizeTokenUsage({
			cachedContentTokenCount: 5,
			promptTokenCount: 10,
			toolUsePromptTokenCount: 4,
			thoughtsTokenCount: 3,
			candidatesTokenCount: 8
		});

		expect(normalized.inputTokenCount).toBe(19);
		expect(normalized.outputTokenCount).toBe(8);
		expect(normalized.totalTokenCount).toBe(30);
	});

	it('sums token usage totals safely', () => {
		const merged = sumTokenUsageTotals(
			{
				cachedContentTokenCount: 2,
				promptTokenCount: 4,
				toolUsePromptTokenCount: 1,
				thoughtsTokenCount: 3,
				candidatesTokenCount: 5,
				inputTokenCount: 7,
				outputTokenCount: 5,
				totalTokenCount: 15
			},
			{
				cachedContentTokenCount: 1,
				promptTokenCount: 6,
				toolUsePromptTokenCount: 2,
				thoughtsTokenCount: 1,
				candidatesTokenCount: 4,
				inputTokenCount: 9,
				outputTokenCount: 4,
				totalTokenCount: 14
			}
		);

		expect(merged.cachedContentTokenCount).toBe(3);
		expect(merged.promptTokenCount).toBe(10);
		expect(merged.toolUsePromptTokenCount).toBe(3);
		expect(merged.thoughtsTokenCount).toBe(4);
		expect(merged.candidatesTokenCount).toBe(9);
		expect(merged.inputTokenCount).toBe(16);
		expect(merged.outputTokenCount).toBe(9);
		expect(merged.totalTokenCount).toBe(29);
	});

	it('aggregates feature-level reports', () => {
		const report = createTokenUsageReport([
			{
				feature: 'conversation_llm',
				usage: {
					promptTokenCount: 11,
					candidatesTokenCount: 7,
					totalTokenCount: 18
				}
			},
			{
				feature: 'conversation_tts',
				usage: {
					promptTokenCount: 5,
					candidatesTokenCount: 2,
					totalTokenCount: 7
				}
			}
		]);

		expect(report.byFeature.conversation_llm?.totalTokenCount).toBe(18);
		expect(report.byFeature.conversation_tts?.totalTokenCount).toBe(7);
		expect(report.totals.totalTokenCount).toBe(25);
		expect(report.totals.inputTokenCount).toBe(16);
		expect(report.totals.outputTokenCount).toBe(9);
	});

	it('merges reports while preserving per-feature totals', () => {
		const base = {
			byFeature: {
				conversation_asr: {
					...createEmptyTokenUsageTotals(),
					inputTokenCount: 12,
					totalTokenCount: 12,
					promptTokenCount: 12
				}
			},
			totals: {
				...createEmptyTokenUsageTotals(),
				inputTokenCount: 12,
				totalTokenCount: 12,
				promptTokenCount: 12
			}
		};

		const addition = createTokenUsageReport([
			{
				feature: 'conversation_llm',
				usage: {
					promptTokenCount: 20,
					candidatesTokenCount: 10,
					totalTokenCount: 30
				}
			}
		]);

		const merged = mergeTokenUsageReports(base, addition);

		expect(merged.byFeature.conversation_asr?.totalTokenCount).toBe(12);
		expect(merged.byFeature.conversation_llm?.totalTokenCount).toBe(30);
		expect(merged.totals.totalTokenCount).toBe(42);
		expect(merged.totals.promptTokenCount).toBe(32);
		expect(merged.totals.candidatesTokenCount).toBe(10);
	});
});
