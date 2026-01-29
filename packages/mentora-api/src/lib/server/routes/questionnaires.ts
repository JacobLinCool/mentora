/**
 * Questionnaire route handlers
 */

import { Courses, Questionnaires, type Questionnaire } from 'mentora-firebase';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { requireAuth } from './utils.js';

/**
 * GET /api/questionnaires?courseId=X[&available=true]
 * List questionnaires for a course (validates membership server-side)
 */
async function listQuestionnaires(ctx: RouteContext, request: Request): Promise<Response> {
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
			'Not authorized to view course questionnaires',
			HttpStatus.FORBIDDEN,
			ServerErrorCode.PERMISSION_DENIED
		);
	}

	// Query questionnaires
	let query = ctx.firestore
		.collection(Questionnaires.collectionPath())
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
	const questionnaires: Questionnaire[] = snapshot.docs.map((doc) =>
		Questionnaires.schema.parse(doc.data())
	);

	return jsonResponse(questionnaires);
}

/**
 * Export route definitions
 */
export const questionnaireRoutes: RouteDefinition[] = [
	{
		method: 'GET',
		pattern: '/questionnaires',
		handler: listQuestionnaires,
		requireAuth: true
	}
];

export { listQuestionnaires };
