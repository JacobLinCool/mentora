import type { MessageStance, TokenUsageTotals } from 'mentora-firebase';
import { createEmptyTokenUsageTotals, sumTokenUsageTotals } from '../llm/token-usage.js';
import type { IAnalyticsRepository } from '../repositories/ports/analytics-repository.js';

type DashboardOverview = {
	activeStudents: number;
	completionRate: number;
	avgEngagement: number;
	totalArguments: number;
};

type SpectrumPoint = {
	id: number;
	name: string;
	initial: number;
	current: number;
};

type WordCloudPoint = {
	text: string;
	value: number;
	sentiment: 'neutral' | 'pro' | 'con';
};

type TokenUsageDay = {
	date: string;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	byFeature: Record<string, TokenUsageTotals>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STOP_WORDS = new Set([
	'the',
	'and',
	'for',
	'that',
	'with',
	'this',
	'have',
	'from',
	'your',
	'about',
	'into',
	'they',
	'them',
	'you',
	'are',
	'was',
	'were',
	'will',
	'can',
	'not',
	'but',
	'all',
	'any',
	'our',
	'out',
	'too',
	'its',
	'than',
	'then',
	'what',
	'when',
	'where',
	'who',
	'why',
	'how',
	'also',
	'very',
	'just',
	'like',
	'there',
	'their',
	'been',
	'being',
	'more',
	'most',
	'only',
	'each',
	'much',
	'many',
	'some',
	'such',
	'does',
	'did',
	'done',
	'could',
	'should',
	'would',
	'might',
	'must'
]);

function scoreFromStance(stance: MessageStance | null | undefined): number {
	switch (stance) {
		case 'pro-strong':
			return 10;
		case 'pro-weak':
			return 5;
		case 'con-weak':
			return -5;
		case 'con-strong':
			return -10;
		default:
			return 0;
	}
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, ' ')
		.split(/\s+/)
		.filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function roundTo(value: number, digits: number): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

function toIsoDay(timestamp: number): string {
	const date = new Date(timestamp);
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function parseDayWindow(raw: string | null): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return 7;
	}
	return Math.min(parsed, 30);
}

export class AnalyticsService {
	constructor(private readonly analyticsRepository: IAnalyticsRepository) {}

	async getDashboard(ownerId: string) {
		const courseIds = await this.analyticsRepository.listOwnedCourseIds(ownerId);
		if (courseIds.length === 0) {
			return {
				overview: {
					activeStudents: 0,
					completionRate: 0,
					avgEngagement: 0,
					totalArguments: 0
				},
				spectrum: [],
				wordCloud: []
			};
		}

		const studentIdsByCourse = new Map<string, Set<string>>();
		const studentNames = new Map<string, string>();
		for (const courseId of courseIds) {
			const roster = await this.analyticsRepository.listActiveRoster(courseId);
			const studentIds = new Set<string>();
			for (const member of roster) {
				if (member.role !== 'student' || !member.userId) {
					continue;
				}
				studentIds.add(member.userId);
				if (!studentNames.has(member.userId)) {
					studentNames.set(member.userId, member.email.split('@')[0] || 'Student');
				}
			}
			studentIdsByCourse.set(courseId, studentIds);
		}

		const uniqueStudents = new Set<string>();
		for (const ids of studentIdsByCourse.values()) {
			for (const uid of ids) uniqueStudents.add(uid);
		}
		const activeStudents = uniqueStudents.size;

		const assignmentsByCourse = new Map<string, string[]>();
		const courseIdByAssignment = new Map<string, string>();
		for (const courseId of courseIds) {
			const assignments = await this.analyticsRepository.listAssignmentsByCourse(courseId);
			assignmentsByCourse.set(
				courseId,
				assignments.map((assignment) => assignment.id)
			);
			for (const assignment of assignments) {
				courseIdByAssignment.set(assignment.id, courseId);
			}
		}

		let totalAssignable = 0;
		for (const courseId of courseIds) {
			const studentCount = studentIdsByCourse.get(courseId)?.size ?? 0;
			const assignmentCount = assignmentsByCourse.get(courseId)?.length ?? 0;
			totalAssignable += studentCount * assignmentCount;
		}

		let submittedCount = 0;
		let totalArguments = 0;
		const spectrum: SpectrumPoint[] = [];
		const wordFreq = new Map<string, number>();

		for (const [assignmentId, courseId] of courseIdByAssignment.entries()) {
			const studentSet = studentIdsByCourse.get(courseId) ?? new Set<string>();
			const submissions = await this.analyticsRepository.listSubmissionsByAssignment(assignmentId);
			for (const submission of submissions) {
				if (!studentSet.has(submission.userId)) {
					continue;
				}
				if (submission.state === 'submitted' || submission.state === 'graded_complete') {
					submittedCount += 1;
				}
			}

			const conversations =
				await this.analyticsRepository.listConversationsByAssignment(assignmentId);
			for (const conversation of conversations) {
				if (!studentSet.has(conversation.userId)) {
					continue;
				}

				const studentTurns = conversation.turns.filter((_, index) => index % 2 === 0);
				totalArguments += studentTurns.length;
				for (const turn of studentTurns) {
					for (const token of tokenize(turn.text)) {
						wordFreq.set(token, (wordFreq.get(token) ?? 0) + 1);
					}
				}

				const stanceTurns = studentTurns.filter((turn) => turn.analysis?.stance);
				if (stanceTurns.length > 0) {
					const first = stanceTurns[0];
					const last = stanceTurns[stanceTurns.length - 1];
					spectrum.push({
						id: spectrum.length + 1,
						name: studentNames.get(conversation.userId) ?? `Student ${spectrum.length + 1}`,
						initial: scoreFromStance(first.analysis?.stance),
						current: scoreFromStance(last.analysis?.stance)
					});
				}
			}
		}

		const completionRate =
			totalAssignable > 0 ? roundTo((submittedCount / totalAssignable) * 100, 1) : 0;
		const avgEngagement = activeStudents > 0 ? roundTo(totalArguments / activeStudents, 2) : 0;
		const wordCloud: WordCloudPoint[] = [...wordFreq.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 50)
			.map(([text, value]) => ({ text, value, sentiment: 'neutral' }));

		const overview: DashboardOverview = {
			activeStudents,
			completionRate,
			avgEngagement,
			totalArguments
		};
		return {
			overview,
			spectrum,
			wordCloud
		};
	}

	async getTokenUsage(ownerId: string, dayWindow: number) {
		const now = Date.now();
		const endDay = toIsoDay(now);
		const endDayStartAt = new Date(`${endDay}T00:00:00.000Z`).getTime();
		const startAt = endDayStartAt - (dayWindow - 1) * DAY_MS;

		const dayBuckets = new Map<
			string,
			{
				totals: TokenUsageTotals;
				byFeature: Record<string, TokenUsageTotals>;
			}
		>();
		for (let offset = 0; offset < dayWindow; offset++) {
			const dayTs = startAt + offset * DAY_MS;
			dayBuckets.set(toIsoDay(dayTs), {
				totals: createEmptyTokenUsageTotals(),
				byFeature: {}
			});
		}

		const overallTotals = createEmptyTokenUsageTotals();
		const overallByFeature: Record<string, TokenUsageTotals> = {};
		const courseIds = await this.analyticsRepository.listOwnedCourseIds(ownerId);
		if (courseIds.length === 0) {
			return {
				days: [...dayBuckets.entries()].map(([date, usage]) => ({
					date,
					inputTokens: usage.totals.inputTokenCount,
					outputTokens: usage.totals.outputTokenCount,
					totalTokens: usage.totals.totalTokenCount,
					byFeature: usage.byFeature
				})),
				totals: {
					inputTokens: overallTotals.inputTokenCount,
					outputTokens: overallTotals.outputTokenCount,
					totalTokens: overallTotals.totalTokenCount,
					byFeature: overallByFeature
				},
				windowDays: dayWindow
			};
		}

		const studentIdsByCourse = new Map<string, Set<string>>();
		const assignmentCourseMap = new Map<string, string>();
		for (const courseId of courseIds) {
			const roster = await this.analyticsRepository.listActiveRoster(courseId);
			const studentIds = new Set<string>();
			for (const member of roster) {
				if (member.role === 'student' && member.userId) {
					studentIds.add(member.userId);
				}
			}
			studentIdsByCourse.set(courseId, studentIds);

			const assignments = await this.analyticsRepository.listAssignmentsByCourse(courseId);
			for (const assignment of assignments) {
				assignmentCourseMap.set(assignment.id, courseId);
			}
		}

		for (const [assignmentId, courseId] of assignmentCourseMap.entries()) {
			const studentIds = studentIdsByCourse.get(courseId) ?? new Set<string>();
			const conversations =
				await this.analyticsRepository.listConversationsByAssignment(assignmentId);
			for (const conversation of conversations) {
				if (!studentIds.has(conversation.userId)) {
					continue;
				}
				for (const turn of conversation.turns) {
					if (!turn.tokenUsage) {
						continue;
					}
					const dayKey = toIsoDay(turn.createdAt);
					const bucket = dayBuckets.get(dayKey);
					if (!bucket) {
						continue;
					}
					bucket.totals = sumTokenUsageTotals(bucket.totals, turn.tokenUsage.totals);
					for (const [feature, featureUsage] of Object.entries(turn.tokenUsage.byFeature ?? {})) {
						bucket.byFeature[feature] = sumTokenUsageTotals(
							bucket.byFeature[feature],
							featureUsage
						);
						overallByFeature[feature] = sumTokenUsageTotals(
							overallByFeature[feature],
							featureUsage
						);
					}

					const totals = turn.tokenUsage.totals;
					overallTotals.cachedContentTokenCount += totals.cachedContentTokenCount;
					overallTotals.promptTokenCount += totals.promptTokenCount;
					overallTotals.toolUsePromptTokenCount += totals.toolUsePromptTokenCount;
					overallTotals.thoughtsTokenCount += totals.thoughtsTokenCount;
					overallTotals.candidatesTokenCount += totals.candidatesTokenCount;
					overallTotals.inputTokenCount += totals.inputTokenCount;
					overallTotals.outputTokenCount += totals.outputTokenCount;
					overallTotals.totalTokenCount += totals.totalTokenCount;
				}
			}
		}

		return {
			days: [...dayBuckets.entries()].map(
				([date, usage]) =>
					({
						date,
						inputTokens: usage.totals.inputTokenCount,
						outputTokens: usage.totals.outputTokenCount,
						totalTokens: usage.totals.totalTokenCount,
						byFeature: usage.byFeature
					}) satisfies TokenUsageDay
			),
			totals: {
				inputTokens: overallTotals.inputTokenCount,
				outputTokens: overallTotals.outputTokenCount,
				totalTokens: overallTotals.totalTokenCount,
				byFeature: overallByFeature
			},
			windowDays: dayWindow
		};
	}
}
