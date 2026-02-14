/**
 * Questionnaire route handlers
 */

import { Questionnaires, type Questionnaire } from 'mentora-firebase';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { requireAuth, requireCourseAccess } from './utils.js';

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

	await requireCourseAccess(ctx, courseId, user.uid, 'questionnaires');

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
