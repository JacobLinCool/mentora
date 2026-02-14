/**
 * Health check route handlers
 */

import { jsonResponse, type RouteContext, type RouteDefinition } from '../types.js';
import { createServiceContainer } from '../application/container.js';

/**
 * GET /api/health
 * Simple health check
 */
async function rootHealth(ctx: RouteContext): Promise<Response> {
	const { healthService } = createServiceContainer(ctx);
	const data = healthService.rootHealth();

	return jsonResponse({
		success: true,
		data: {
			status: data.status
		}
	});
}

/**
 * GET /api/health/firestore
 * Firestore connectivity check (requires authentication, no collection counts)
 */
async function firestoreHealth(ctx: RouteContext): Promise<Response> {
	const { healthService } = createServiceContainer(ctx);
	await healthService.firestoreHealth();

	return jsonResponse({
		success: true,
		data: {
			status: 'ok'
		}
	});
}

/**
 * Export route definitions
 */
export const healthRoutes: RouteDefinition[] = [
	{
		method: 'GET',
		pattern: '/health',
		handler: rootHealth,
		requireAuth: false
	},
	{
		method: 'GET',
		pattern: '/health/firestore',
		handler: firestoreHealth,
		requireAuth: true
	}
];

export { rootHealth, firestoreHealth };
