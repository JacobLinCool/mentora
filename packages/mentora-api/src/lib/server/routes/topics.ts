/**
 * Topic route handlers
 */

import { Topics, type Topic } from 'mentora-firebase';
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
 * GET /api/topics?courseId=X
 * List topics for a course (validates membership server-side)
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

	await requireCourseAccess(ctx, courseId, user.uid, 'topics', { allowPublic: true });

	// Query topics
	let query = ctx.firestore
		.collection(Topics.collectionPath())
		.where('courseId', '==', courseId)
		.orderBy('order', 'asc');

	if (limitParam) {
		const limit = parseInt(limitParam, 10);
		if (!isNaN(limit) && limit > 0) {
			query = query.limit(limit);
		}
	}

	const snapshot = await query.get();
	const topics: Topic[] = snapshot.docs.map((doc) => Topics.schema.parse(doc.data()));

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
