/**
 * Announcement route handlers
 */

import { jsonResponse, type RouteContext, type RouteDefinition } from '../types.js';
import { createServiceContainer } from '../application/container.js';
import { requireAuth, requireParam } from './utils.js';

/**
 * POST /api/announcements/:id/read
 * Mark one announcement as read for the current user.
 */
async function markRead(ctx: RouteContext, _request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const announcementId = requireParam(ctx, 'id');

	const { announcementService } = createServiceContainer(ctx);
	const result = await announcementService.markAnnouncementRead(user.uid, announcementId);
	return jsonResponse(result);
}

/**
 * POST /api/announcements/read-all
 * Mark all announcements as read for the current user.
 */
async function markAllRead(ctx: RouteContext, _request: Request): Promise<Response> {
	const user = requireAuth(ctx);

	const { announcementService } = createServiceContainer(ctx);
	const result = await announcementService.markAllAnnouncementsRead(user.uid);
	return jsonResponse(result);
}

/**
 * Export route definitions
 */
export const announcementRoutes: RouteDefinition[] = [
	{
		method: 'POST',
		pattern: '/announcements/:id/read',
		handler: markRead,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/announcements/read-all',
		handler: markAllRead,
		requireAuth: true
	}
];

export { markAllRead, markRead };
