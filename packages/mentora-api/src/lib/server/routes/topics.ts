/**
 * Topic route handlers
 */

import { Courses, Topics, type Topic } from 'mentora-firebase';
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
			'Not authorized to view course topics',
			HttpStatus.FORBIDDEN,
			ServerErrorCode.PERMISSION_DENIED
		);
	}

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
