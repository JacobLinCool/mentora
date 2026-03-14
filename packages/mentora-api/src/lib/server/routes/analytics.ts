/**
 * Analytics route handlers
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
import { requireAuth, requireParam } from './utils.js';
import { getGenAIClient, EXECUTOR_MODEL } from '../llm/executors.js';

/**
 * GET /api/analytics/dashboard
 * Aggregate analytics for instructor-owned courses
 */
async function getDashboard(ctx: RouteContext): Promise<Response> {
	const user = requireAuth(ctx);
	const { analyticsService } = createServiceContainer(ctx);
	const data = await analyticsService.getDashboard(user.uid);
	return jsonResponse(data);
}

/**
 * GET /api/analytics/token-usage?days=7
 * Aggregate token usage for instructor-owned courses.
 */
async function getTokenUsage(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const url = new URL(request.url);
	const { analyticsService, parseDayWindow } = createServiceContainer(ctx);
	const dayWindow = parseDayWindow(url.searchParams.get('days'));
	const data = await analyticsService.getTokenUsage(user.uid, dayWindow);
	return jsonResponse(data);
}

/**
 * GET /api/analytics/assignment/:assignmentId?courseId=xxx
 * Get per-assignment analytics data
 */
async function getAssignmentAnalytics(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const assignmentId = requireParam(ctx, 'assignmentId');
	const url = new URL(request.url);
	const courseId = url.searchParams.get('courseId');
	if (!courseId) {
		throw errorResponse(
			'courseId is required',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	const { analyticsService } = createServiceContainer(ctx);
	const ownedCourses = await analyticsService.listOwnedCourseIds(user.uid);
	if (!ownedCourses.includes(courseId)) {
		throw errorResponse('Forbidden', HttpStatus.FORBIDDEN, ServerErrorCode.PERMISSION_DENIED);
	}
	const data = await analyticsService.getAssignmentAnalytics(assignmentId, courseId);
	if (!data) {
		throw errorResponse('Assignment not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
	}
	return jsonResponse(data);
}

/**
 * POST /api/analytics/class-report
 * Generate AI class report for an assignment
 */
async function generateClassReport(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = (await request.json()) as { assignmentId?: string; courseId?: string };
	const { assignmentId, courseId } = body;
	if (!assignmentId || !courseId) {
		throw errorResponse(
			'assignmentId and courseId are required',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	const { analyticsService } = createServiceContainer(ctx);
	const ownedCourses = await analyticsService.listOwnedCourseIds(user.uid);
	if (!ownedCourses.includes(courseId)) {
		throw errorResponse('Forbidden', HttpStatus.FORBIDDEN, ServerErrorCode.PERMISSION_DENIED);
	}
	const genai = getGenAIClient();
	const classReport = await analyticsService.generateClassReport(
		assignmentId,
		courseId,
		genai,
		EXECUTOR_MODEL.CONTENT
	);
	if (!classReport) {
		throw errorResponse('Assignment not found', HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
	}
	return jsonResponse(classReport);
}

export const analyticsRoutes: RouteDefinition[] = [
	{
		method: 'GET',
		pattern: '/analytics/dashboard',
		handler: getDashboard,
		requireAuth: true
	},
	{
		method: 'GET',
		pattern: '/analytics/token-usage',
		handler: getTokenUsage,
		requireAuth: true
	},
	{
		method: 'GET',
		pattern: '/analytics/assignment/:assignmentId',
		handler: getAssignmentAnalytics,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/analytics/class-report',
		handler: generateClassReport,
		requireAuth: true
	}
];

export { getDashboard, getTokenUsage, getAssignmentAnalytics, generateClassReport };
