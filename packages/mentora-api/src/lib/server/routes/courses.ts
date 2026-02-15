/**
 * Course route handlers
 */

import {
	CopyCourseSchema,
	CreateCourseAnnouncementSchema,
	CreateCourseSchema,
	JoinCourseSchema
} from '../llm/schemas.js';
import { HttpStatus, jsonResponse, type RouteContext, type RouteDefinition } from '../types.js';
import { createServiceContainer } from '../application/container.js';
import { parseBody, requireAuth, requireParam } from './utils.js';

/**
 * POST /api/courses
 * Create a new course with code uniqueness validation
 */
async function createCourse(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = await parseBody(request, CreateCourseSchema);

	const { courseService } = createServiceContainer(ctx);
	const result = await courseService.createCourse(user, body);
	return jsonResponse(result, HttpStatus.CREATED);
}

/**
 * POST /api/courses/:id/copy
 * Deep copy a course with topics, assignments, and questionnaires
 */
async function copyCourse(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const sourceCourseId = requireParam(ctx, 'id');
	const body = await parseBody(request, CopyCourseSchema);

	const { courseService } = createServiceContainer(ctx);
	const result = await courseService.copyCourse(user, sourceCourseId, body);
	return jsonResponse(result, HttpStatus.CREATED);
}

/**
 * POST /api/courses/join
 * Join a course by enrollment code
 */
async function joinByCode(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = await parseBody(request, JoinCourseSchema);

	const { courseService } = createServiceContainer(ctx);
	const result = await courseService.joinByCode(user, body);

	if (result.joined && result.alreadyMember === undefined) {
		return jsonResponse(result, HttpStatus.CREATED);
	}
	return jsonResponse(result, HttpStatus.OK);
}

/**
 * POST /api/courses/:id/announcements
 * Create a course announcement and fan out user announcements.
 */
async function createAnnouncement(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const courseId = requireParam(ctx, 'id');
	const body = await parseBody(request, CreateCourseAnnouncementSchema);

	const { announcementService } = createServiceContainer(ctx);
	const result = await announcementService.createCourseAnnouncement(user, courseId, body.content);
	return jsonResponse(result, HttpStatus.CREATED);
}

/**
 * Export route definitions
 */
export const courseRoutes: RouteDefinition[] = [
	{
		method: 'POST',
		pattern: '/courses',
		handler: createCourse,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/courses/:id/copy',
		handler: copyCourse,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/courses/join',
		handler: joinByCode,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/courses/:id/announcements',
		handler: createAnnouncement,
		requireAuth: true
	}
];

export { copyCourse, createAnnouncement, createCourse, joinByCode };
