/**
 * Topic route handlers
 */

import {
	HttpStatus,
	ServerErrorCode,
	errorResponse,
	jsonResponse,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { createServiceContainer } from '../application/container.js';
import { requireAuth } from './utils.js';

/**
 * GET /api/topics?courseId=X
 * List topics for a course
 */
async function listTopics(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const url = new URL(request.url);
	const courseId = url.searchParams.get('courseId');
	const limitParam = url.searchParams.get('limit');

	if (!courseId) {
		return errorResponse(
			'courseId is required',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
	const { catalogService } = createServiceContainer(ctx);
	const topics = await catalogService.listTopics({
		courseId,
		userId: user.uid,
		limit: Number.isFinite(limit) && (limit ?? 0) > 0 ? limit : undefined
	});
	return jsonResponse(topics);
}

/**
 * Export route definitions
 */
export const topicRoutes: RouteDefinition[] = [
	{
		method: 'GET',
		pattern: '/topics',
		handler: listTopics,
		requireAuth: true
	}
];

export { listTopics };
