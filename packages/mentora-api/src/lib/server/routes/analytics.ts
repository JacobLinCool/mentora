/**
 * Analytics route handlers
 */

import { jsonResponse, type RouteContext, type RouteDefinition } from '../types.js';
import { createServiceContainer } from '../application/container.js';
import { requireAuth } from './utils.js';

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
	}
];

export { getDashboard, getTokenUsage };
