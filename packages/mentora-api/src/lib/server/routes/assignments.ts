/**
 * Assignment route handlers
 */

import { Assignments, type Assignment } from 'mentora-firebase';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { requireAuth, requireCourseAccess, parseBody } from './utils.js';
import { GenerateContentSchema } from '../llm/schemas.js';
import { EXECUTOR_MODEL, getContentExecutor } from '../llm/executors.js';
import { TOKEN_USAGE_FEATURES, createTokenUsageReport } from '../llm/token-usage.js';

/**
 * GET /api/assignments?courseId=X[&available=true]
 * List assignments for a course (validates membership server-side)
 */
async function listAssignments(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const url = new URL(request.url);
	const courseId = url.searchParams.get('courseId');
	const available = url.searchParams.get('available') === 'true';
	const limitParam = url.searchParams.get('limit');

	if (!courseId) {
		return errorResponse(
			'courseId is required',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	await requireCourseAccess(ctx, courseId, user.uid, 'assignments');

	// Query assignments
	let query = ctx.firestore
		.collection(Assignments.collectionPath())
		.where('courseId', '==', courseId);

	// If available=true, filter by startAt <= now
	if (available) {
		const now = Date.now();
		query = query.where('startAt', '<=', now);
	}

	query = query.orderBy('startAt', 'desc');

	if (limitParam) {
		const limit = parseInt(limitParam, 10);
		if (!isNaN(limit) && limit > 0) {
			query = query.limit(limit);
		}
	}

	const snapshot = await query.get();
	const assignments: Assignment[] = snapshot.docs.map((doc) =>
		Assignments.schema.parse(doc.data())
	);

	return jsonResponse(assignments);
}

/**
 * POST /api/assignments/generate-content
 * Generate educational reference content from a question
 *
 * This endpoint helps teachers create detailed assignment prompts by:
 * 1. Taking a simple question as input
 * 2. Using AI to generate comprehensive reference content
 * 3. Includes concept explanations, definitions, and context
 * 4. Powered by Google Search for up-to-date information
 *
 * The generated content should be stored as the assignment's `prompt` field,
 * while the original question goes into the `question` field.
 */
async function generateContent(ctx: RouteContext, request: Request): Promise<Response> {
	requireAuth(ctx); // Must be authenticated to use this feature

	const body = await parseBody(request, GenerateContentSchema);
	const { question } = body;

	try {
		const contentExecutor = getContentExecutor();

		// Reset token usage for this request
		contentExecutor.resetTokenUsage();

		// Generate detailed content from the question
		const generatedContent = await contentExecutor.generateContent(question);
		const tokenUsage = createTokenUsageReport([
			{
				feature: TOKEN_USAGE_FEATURES.ASSIGNMENT_CONTENT_GENERATION,
				usage: contentExecutor.getTokenUsage()
			}
		]);

		return jsonResponse(
			{
				content: generatedContent,
				tokenUsage: {
					byFeature: tokenUsage.byFeature,
					totals: tokenUsage.totals,
					models: {
						[TOKEN_USAGE_FEATURES.ASSIGNMENT_CONTENT_GENERATION]: EXECUTOR_MODEL.CONTENT
					}
				}
			},
			HttpStatus.OK
		);
	} catch (error) {
		console.error('[API] Error generating content:', error);
		return errorResponse(
			'Failed to generate content. Please try again.',
			HttpStatus.INTERNAL_SERVER_ERROR,
			ServerErrorCode.INTERNAL_ERROR
		);
	}
}

/**
 * Export route definitions
 */
export const assignmentRoutes: RouteDefinition[] = [
	{
		method: 'GET',
		pattern: '/assignments',
		handler: listAssignments,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/assignments/generate-content',
		handler: generateContent,
		requireAuth: true
	}
];

export { listAssignments, generateContent };
