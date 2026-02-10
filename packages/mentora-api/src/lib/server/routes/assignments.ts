/**
 * Assignment route handlers
 */

import { Assignments, Courses, type Assignment } from 'mentora-firebase';
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
import { getContentExecutor } from '../llm/executors.js';

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

	// Check if course exists
	const courseDoc = await ctx.firestore.doc(Courses.docPath(courseId)).get();
	if (!courseDoc.exists) {
		return errorResponse('Course not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
	}

	const courseData = Courses.schema.parse(courseDoc.data());

	// Check if user has access (owner, member, or public course)
	let hasAccess = courseData.visibility === 'public';
	if (!hasAccess && courseData.ownerId === user.uid) {
		hasAccess = true;
	}
	if (!hasAccess) {
		const memberDoc = await ctx.firestore.doc(Courses.roster.docPath(courseId, user.uid)).get();
		if (memberDoc.exists) {
			const memberData = Courses.roster.schema.parse(memberDoc.data());
			hasAccess = memberData.status === 'active';
		}
	}

	if (!hasAccess) {
		return errorResponse(
			'Not authorized to view course assignments',
			HttpStatus.FORBIDDEN,
			ServerErrorCode.PERMISSION_DENIED
		);
	}

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

		return jsonResponse(
			{
				content: generatedContent
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
