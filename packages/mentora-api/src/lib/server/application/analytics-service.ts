import type { GoogleGenAI } from '@google/genai';
import type {
	AssessmentResult,
	ClassReport,
	Conversation,
	MessageStance,
	TokenUsageTotals
} from 'mentora-firebase';
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

type AssignmentAnalyticsPoint = {
	stance: number;
	name: string;
};

type StanceExcerpt = {
	text: string;
	stance: 'pro' | 'con';
};

export type AssignmentAnalytics = {
	title: string;
	dueAt: number | null;
	submittedCount: number;
	totalStudents: number;
	avgScore: number | null;
	spectrum: AssignmentAnalyticsPoint[];
	excerpts: StanceExcerpt[];
	classReport: ClassReport | null;
	scores: Array<{
		userId: string;
		name: string;
		overallScore: number;
		dimensions: {
			argumentQuality: number;
			criticalThinking: number;
			principleExtraction: number;
			openness: number;
			coherence: number;
		};
		submittedAt: number | null;
		late: boolean;
		conversationId: string | null;
	}>;
};

export class AnalyticsService {
	constructor(private readonly analyticsRepository: IAnalyticsRepository) {}

	async listOwnedCourseIds(ownerId: string): Promise<string[]> {
		return this.analyticsRepository.listOwnedCourseIds(ownerId);
	}

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
				wordCloud: [],
				assessmentOverview: {
					avgScores: {
						argumentQuality: 0,
						criticalThinking: 0,
						principleExtraction: 0,
						openness: 0,
						coherence: 0,
						overall: 0
					},
					scoreDistribution: [
						{ range: '1-2', count: 0 },
						{ range: '2-3', count: 0 },
						{ range: '3-4', count: 0 },
						{ range: '4-5', count: 0 }
					],
					needsAttention: []
				}
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
		const wordSentiment = new Map<string, { pro: number; con: number; neutral: number }>();
		const assessedSubmissions: Array<{
			userId: string;
			assignmentId: string;
			assessment: AssessmentResult;
		}> = [];

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
				if (submission.assessment) {
					assessedSubmissions.push({
						userId: submission.userId,
						assignmentId,
						assessment: submission.assessment
					});
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
					const stance = turn.analysis?.stance;
					const sentiment = stance?.startsWith('pro')
						? 'pro'
						: stance?.startsWith('con')
							? 'con'
							: 'neutral';
					for (const token of tokenize(turn.text)) {
						wordFreq.set(token, (wordFreq.get(token) ?? 0) + 1);
						const existing = wordSentiment.get(token) ?? { pro: 0, con: 0, neutral: 0 };
						existing[sentiment] += 1;
						wordSentiment.set(token, existing);
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
			.map(([text, value]) => {
				const sentiments = wordSentiment.get(text) ?? { pro: 0, con: 0, neutral: 0 };
				const dominant =
					sentiments.pro >= sentiments.con && sentiments.pro > sentiments.neutral
						? 'pro'
						: sentiments.con > sentiments.pro && sentiments.con > sentiments.neutral
							? 'con'
							: 'neutral';
				return { text, value, sentiment: dominant as WordCloudPoint['sentiment'] };
			});

		// Build assessment overview
		const assessmentCount = assessedSubmissions.length;
		const dimSums = {
			argumentQuality: 0,
			criticalThinking: 0,
			principleExtraction: 0,
			openness: 0,
			coherence: 0
		};
		let overallSum = 0;
		const scoreDistribution = [
			{ range: '1-2', count: 0 },
			{ range: '2-3', count: 0 },
			{ range: '3-4', count: 0 },
			{ range: '4-5', count: 0 }
		];
		const needsAttention: Array<{
			studentName: string;
			courseTitle: string;
			overallScore: number;
			weakestDimension: string;
		}> = [];

		for (const { userId, assignmentId, assessment } of assessedSubmissions) {
			const dims = assessment.dimensions;
			dimSums.argumentQuality += dims.argumentQuality.score;
			dimSums.criticalThinking += dims.criticalThinking.score;
			dimSums.principleExtraction += dims.principleExtraction.score;
			dimSums.openness += dims.openness.score;
			dimSums.coherence += dims.coherence.score;
			overallSum += assessment.overallScore;

			const score = assessment.overallScore;
			if (score < 2) {
				scoreDistribution[0].count += 1;
			} else if (score < 3) {
				scoreDistribution[1].count += 1;
			} else if (score < 4) {
				scoreDistribution[2].count += 1;
			} else {
				scoreDistribution[3].count += 1;
			}

			if (score < 2.5) {
				const dimEntries = Object.entries(dims) as Array<
					[string, { score: number; feedback: string }]
				>;
				const weakest = dimEntries.reduce((min, curr) =>
					curr[1].score < min[1].score ? curr : min
				);
				const courseId = courseIdByAssignment.get(assignmentId) ?? assignmentId;
				needsAttention.push({
					studentName: studentNames.get(userId) ?? 'Student',
					courseTitle: courseId,
					overallScore: score,
					weakestDimension: weakest[0]
				});
			}
		}

		const assessmentOverview = {
			avgScores: {
				argumentQuality:
					assessmentCount > 0 ? roundTo(dimSums.argumentQuality / assessmentCount, 2) : 0,
				criticalThinking:
					assessmentCount > 0 ? roundTo(dimSums.criticalThinking / assessmentCount, 2) : 0,
				principleExtraction:
					assessmentCount > 0 ? roundTo(dimSums.principleExtraction / assessmentCount, 2) : 0,
				openness: assessmentCount > 0 ? roundTo(dimSums.openness / assessmentCount, 2) : 0,
				coherence: assessmentCount > 0 ? roundTo(dimSums.coherence / assessmentCount, 2) : 0,
				overall: assessmentCount > 0 ? roundTo(overallSum / assessmentCount, 2) : 0
			},
			scoreDistribution,
			needsAttention
		};

		const overview: DashboardOverview = {
			activeStudents,
			completionRate,
			avgEngagement,
			totalArguments
		};
		return {
			overview,
			spectrum,
			wordCloud,
			assessmentOverview
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

	async getAssignmentAnalytics(
		assignmentId: string,
		courseId: string
	): Promise<AssignmentAnalytics | null> {
		const assignment = await this.analyticsRepository.getAssignment(assignmentId);
		if (!assignment || assignment.courseId !== courseId) {
			return null;
		}

		const roster = await this.analyticsRepository.listActiveRoster(courseId);
		const studentIds = new Set<string>();
		const studentNames = new Map<string, string>();
		for (const member of roster) {
			if (member.role !== 'student' || !member.userId) continue;
			studentIds.add(member.userId);
			studentNames.set(member.userId, member.email.split('@')[0] || 'Student');
		}

		const [submissions, conversations] = await Promise.all([
			this.analyticsRepository.listSubmissionsByAssignment(assignmentId),
			this.analyticsRepository.listConversationsByAssignment(assignmentId)
		]);

		const studentSubmissions = submissions.filter((s) => studentIds.has(s.userId));
		const submittedSubs = studentSubmissions.filter(
			(s) => s.state === 'submitted' || s.state === 'graded_complete'
		);

		// Build conversation map by userId
		const convByUser = new Map<string, Conversation>();
		for (const conv of conversations) {
			if (studentIds.has(conv.userId)) {
				convByUser.set(conv.userId, conv);
			}
		}

		// Spectrum: each student's final stance
		const spectrum: AssignmentAnalyticsPoint[] = [];
		const proExcerpts: StanceExcerpt[] = [];
		const conExcerpts: StanceExcerpt[] = [];

		for (const conv of convByUser.values()) {
			const studentTurns = conv.turns.filter((_, i) => i % 2 === 0);
			const stanceTurns = studentTurns.filter(
				(t) => t.analysis?.stance && t.analysis.stance !== 'undetermined'
			);
			if (stanceTurns.length === 0) continue;

			const lastStance = stanceTurns[stanceTurns.length - 1];
			const score = scoreFromStance(lastStance.analysis?.stance);
			spectrum.push({
				stance: score,
				name: studentNames.get(conv.userId) ?? 'Student'
			});

			// Collect excerpts for representative quotes
			const stance = lastStance.analysis?.stance;
			if (stance?.startsWith('pro')) {
				proExcerpts.push({
					text: lastStance.text.slice(0, 80),
					stance: 'pro'
				});
			} else if (stance?.startsWith('con')) {
				conExcerpts.push({
					text: lastStance.text.slice(0, 80),
					stance: 'con'
				});
			}
		}

		// Pick up to 3 excerpts from each side
		const excerpts: StanceExcerpt[] = [...proExcerpts.slice(0, 3), ...conExcerpts.slice(0, 3)];

		// Scores table
		let overallScoreSum = 0;
		let assessedCount = 0;
		const scores: AssignmentAnalytics['scores'] = [];

		for (const sub of studentSubmissions) {
			const conv = convByUser.get(sub.userId);
			const assessment = sub.assessment;
			if (assessment) {
				overallScoreSum += assessment.overallScore;
				assessedCount++;
			}
			scores.push({
				userId: sub.userId,
				name: studentNames.get(sub.userId) ?? 'Student',
				overallScore: assessment?.overallScore ?? 0,
				dimensions: {
					argumentQuality: assessment?.dimensions.argumentQuality.score ?? 0,
					criticalThinking: assessment?.dimensions.criticalThinking.score ?? 0,
					principleExtraction: assessment?.dimensions.principleExtraction.score ?? 0,
					openness: assessment?.dimensions.openness.score ?? 0,
					coherence: assessment?.dimensions.coherence.score ?? 0
				},
				submittedAt: sub.submittedAt ?? null,
				late: sub.late,
				conversationId: conv ? `${conv.userId}_${conv.assignmentId}` : null
			});
		}

		return {
			title: assignment.title,
			dueAt: assignment.dueAt ?? null,
			submittedCount: submittedSubs.length,
			totalStudents: studentIds.size,
			avgScore: assessedCount > 0 ? roundTo(overallScoreSum / assessedCount, 2) : null,
			spectrum,
			excerpts,
			classReport: assignment.classReport ?? null,
			scores
		};
	}

	async generateClassReport(
		assignmentId: string,
		courseId: string,
		genai: GoogleGenAI,
		model: string
	): Promise<ClassReport | null> {
		const assignment = await this.analyticsRepository.getAssignment(assignmentId);
		if (!assignment || assignment.courseId !== courseId) {
			return null;
		}

		const roster = await this.analyticsRepository.listActiveRoster(courseId);
		const studentIds = new Set<string>();
		for (const member of roster) {
			if (member.role === 'student' && member.userId) {
				studentIds.add(member.userId);
			}
		}

		const [submissions, conversations] = await Promise.all([
			this.analyticsRepository.listSubmissionsByAssignment(assignmentId),
			this.analyticsRepository.listConversationsByAssignment(assignmentId)
		]);

		const studentSubmissions = submissions.filter((s) => studentIds.has(s.userId));
		const submittedSubs = studentSubmissions.filter(
			(s) => s.state === 'submitted' || s.state === 'graded_complete'
		);

		// Build data for the AI prompt
		const studentData: string[] = [];
		for (const conv of conversations) {
			if (!studentIds.has(conv.userId)) continue;
			const studentTurns = conv.turns.filter((_, i) => i % 2 === 0);
			const stances = studentTurns.filter((t) => t.analysis?.stance).map((t) => t.analysis!.stance);
			const keyTexts = studentTurns.slice(-2).map((t) => t.text.slice(0, 200));

			const sub = studentSubmissions.find((s) => s.userId === conv.userId);
			const assessment = sub?.assessment;

			studentData.push(
				[
					`立場變化: ${stances.join(' → ')}`,
					`關鍵發言: ${keyTexts.join(' | ')}`,
					assessment ? `評估分數: 整體 ${assessment.overallScore}/5` : '評估: 尚未評估'
				].join('\n')
			);
		}

		const prompt = `你是一位教育分析專家。以下是一門課程中某次作業「${assignment.title}」的班級對話數據。
請根據這些數據產生一份班級分析報告。

作業題目：${assignment.question ?? assignment.title}
已提交人數：${submittedSubs.length}
總學生數：${studentIds.size}

各學生數據：
${studentData.map((d, i) => `--- 學生 ${i + 1} ---\n${d}`).join('\n\n')}

請嚴格按照以下 markdown 結構輸出報告：

## 立場分佈解讀
（全班立場的統計解讀）

## 主要觀點歸納

### 支持方主要論點
- 論點 A：...
- 論點 B：...

### 反對方主要論點
- 論點 X：...
- 論點 Y：...

### 獨特觀點
- ...（少數但有價值的角度）

## 班級討論動態
（全班整體的對話特徵）

## 教學建議
（根據觀點分佈和對話表現，給老師課堂討論的切入建議）`;

		const response = await genai.models.generateContent({
			model,
			contents: [{ text: prompt }],
			config: {
				responseMimeType: 'text/plain',
				systemInstruction:
					'你是一位教育分析專家，專門分析學生討論數據並產生教學報告。使用繁體中文回答。'
			}
		});

		const content = response.text?.trim();
		if (!content) {
			throw new Error('AI report generation returned empty response');
		}

		const classReport: ClassReport = {
			content,
			generatedAt: Date.now(),
			submissionCount: submittedSubs.length
		};

		await this.analyticsRepository.updateAssignmentClassReport(assignmentId, classReport);

		return classReport;
	}
}
