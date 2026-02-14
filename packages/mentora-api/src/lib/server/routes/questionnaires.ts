/**
 * Questionnaire route handlers
 */

import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { createServiceContainer } from '../application/container.js';
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

	const { catalogService } = createServiceContainer(ctx);
	const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
	const questionnaires = await catalogService.listQuestionnaires({
		courseId,
		userId: user.uid,
		available,
		limit: Number.isFinite(limit) && (limit ?? 0) > 0 ? limit : undefined
	});

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
