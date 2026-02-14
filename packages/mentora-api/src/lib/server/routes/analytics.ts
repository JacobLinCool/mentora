/**
 * Analytics route handlers
 */

import {
	AssignmentSubmissions,
	Assignments,
	Conversations,
	Courses,
	type MessageStance,
	type TokenUsageTotals
} from 'mentora-firebase';
import { jsonResponse, requireAuth } from './utils.js';
import type { RouteContext, RouteDefinition } from '../types.js';
import { createEmptyTokenUsageTotals, sumTokenUsageTotals } from '../llm/token-usage.js';

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
	'they',
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
		case 'neutral':
		case 'undetermined':
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

function parseDayWindow(raw: string | null): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return 7;
	}
	return Math.min(parsed, 30);
}

/**
 * GET /api/analytics/dashboard
 * Aggregate analytics for instructor-owned courses
 */
async function getDashboard(ctx: RouteContext): Promise<Response> {
	const user = requireAuth(ctx);

	const courseSnapshot = await ctx.firestore
		.collection(Courses.collectionPath())
		.where('ownerId', '==', user.uid)
		.get();

	if (courseSnapshot.empty) {
		return jsonResponse({
			overview: {
				activeStudents: 0,
				completionRate: 0,
				avgEngagement: 0,
				totalArguments: 0
			},
			spectrum: [],
			wordCloud: []
		});
	}

	const courseIds = courseSnapshot.docs.map((courseDoc) => courseDoc.id);
	const studentIdsByCourse = new Map<string, Set<string>>();
	const studentNames = new Map<string, string>();

	for (const courseId of courseIds) {
		const rosterSnapshot = await ctx.firestore
			.collection(Courses.roster.collectionPath(courseId))
			.where('status', '==', 'active')
			.get();

		const studentIds = new Set<string>();
		for (const memberDoc of rosterSnapshot.docs) {
			const member = Courses.roster.schema.parse(memberDoc.data());
			if (member.role !== 'student') {
				continue;
			}

			const uid = member.userId;
			if (!uid) {
				continue;
			}
			studentIds.add(uid);

			if (!studentNames.has(uid)) {
				studentNames.set(uid, member.email.split('@')[0] || 'Student');
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
		const assignmentSnapshot = await ctx.firestore
			.collection(Assignments.collectionPath())
			.where('courseId', '==', courseId)
			.get();

		const assignmentIds: string[] = [];
		for (const assignmentDoc of assignmentSnapshot.docs) {
			const assignment = Assignments.schema.parse(assignmentDoc.data());
			assignmentIds.push(assignment.id);
			courseIdByAssignment.set(assignment.id, courseId);
		}
		assignmentsByCourse.set(courseId, assignmentIds);
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

		const submissionsSnapshot = await ctx.firestore
			.collection(AssignmentSubmissions.collectionPath(assignmentId))
			.get();

		for (const submissionDoc of submissionsSnapshot.docs) {
			const submission = AssignmentSubmissions.schema.parse(submissionDoc.data());
			if (!studentSet.has(submission.userId)) {
				continue;
			}
			if (submission.state === 'submitted' || submission.state === 'graded_complete') {
				submittedCount += 1;
			}
		}

		const conversationsSnapshot = await ctx.firestore
			.collection(Conversations.collectionPath())
			.where('assignmentId', '==', assignmentId)
			.get();

		for (const conversationDoc of conversationsSnapshot.docs) {
			const conversation = Conversations.schema.parse(conversationDoc.data());
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
		.map(([text, value]) => ({
			text,
			value,
			sentiment: 'neutral'
		}));

	const overview: DashboardOverview = {
		activeStudents,
		completionRate,
		avgEngagement,
		totalArguments
	};

	return jsonResponse({
		overview,
		spectrum,
		wordCloud
	});
}

/**
 * GET /api/analytics/token-usage?days=7
 * Aggregate token usage for instructor-owned courses.
 */
async function getTokenUsage(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const url = new URL(request.url);
	const dayWindow = parseDayWindow(url.searchParams.get('days'));

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

	const courseSnapshot = await ctx.firestore
		.collection(Courses.collectionPath())
		.where('ownerId', '==', user.uid)
		.get();

	if (courseSnapshot.empty) {
		return jsonResponse({
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
		});
	}

	const courseIds = courseSnapshot.docs.map((courseDoc) => courseDoc.id);
	const studentIdsByCourse = new Map<string, Set<string>>();
	const assignmentCourseMap = new Map<string, string>();

	for (const courseId of courseIds) {
		const rosterSnapshot = await ctx.firestore
			.collection(Courses.roster.collectionPath(courseId))
			.where('status', '==', 'active')
			.get();

		const studentIds = new Set<string>();
		for (const memberDoc of rosterSnapshot.docs) {
			const member = Courses.roster.schema.parse(memberDoc.data());
			if (member.role !== 'student' || !member.userId) {
				continue;
			}
			studentIds.add(member.userId);
		}
		studentIdsByCourse.set(courseId, studentIds);

		const assignmentSnapshot = await ctx.firestore
			.collection(Assignments.collectionPath())
			.where('courseId', '==', courseId)
			.get();

		for (const assignmentDoc of assignmentSnapshot.docs) {
			const assignment = Assignments.schema.parse(assignmentDoc.data());
			assignmentCourseMap.set(assignment.id, courseId);
		}
	}

	for (const [assignmentId, courseId] of assignmentCourseMap.entries()) {
		const studentIds = studentIdsByCourse.get(courseId) ?? new Set<string>();
		const conversationsSnapshot = await ctx.firestore
			.collection(Conversations.collectionPath())
			.where('assignmentId', '==', assignmentId)
			.get();

		for (const conversationDoc of conversationsSnapshot.docs) {
			const conversation = Conversations.schema.parse(conversationDoc.data());
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
					bucket.byFeature[feature] = sumTokenUsageTotals(bucket.byFeature[feature], featureUsage);
					overallByFeature[feature] = sumTokenUsageTotals(overallByFeature[feature], featureUsage);
				}

				const normalizedTotals = turn.tokenUsage.totals;
				overallTotals.cachedContentTokenCount += normalizedTotals.cachedContentTokenCount;
				overallTotals.promptTokenCount += normalizedTotals.promptTokenCount;
				overallTotals.toolUsePromptTokenCount += normalizedTotals.toolUsePromptTokenCount;
				overallTotals.thoughtsTokenCount += normalizedTotals.thoughtsTokenCount;
				overallTotals.candidatesTokenCount += normalizedTotals.candidatesTokenCount;
				overallTotals.inputTokenCount += normalizedTotals.inputTokenCount;
				overallTotals.outputTokenCount += normalizedTotals.outputTokenCount;
				overallTotals.totalTokenCount += normalizedTotals.totalTokenCount;
			}
		}
	}

	return jsonResponse({
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
	});
}

export const analyticsRoutes: RouteDefinition[] = [
	{
		method: 'GET',
		pattern: '/analytics/dashboard',
		handler: getDashboard,
		requireAuth: true
	},
	{
		method: 'GET',
		pattern: '/analytics/token-usage',
		handler: getTokenUsage,
		requireAuth: true
	}
];

export { getDashboard, getTokenUsage };
