/**
 * Assignment route handlers
 */

import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { requireAuth, parseBody } from './utils.js';
import { GenerateContentSchema } from '../llm/schemas.js';
import { createServiceContainer } from '../application/container.js';

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

	const { catalogService } = createServiceContainer(ctx);
	const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
	const assignments = await catalogService.listAssignments({
		courseId,
		userId: user.uid,
		available,
		limit: Number.isFinite(limit) && (limit ?? 0) > 0 ? limit : undefined
	});

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
		const { contentGenerationService } = createServiceContainer(ctx);
		const result = await contentGenerationService.generateAssignmentContent(question);

		return jsonResponse(result, HttpStatus.OK);
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
