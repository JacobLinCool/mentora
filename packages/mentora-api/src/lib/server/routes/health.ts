/**
 * Health check route handlers
 */

import { Courses } from 'mentora-firebase';
import { jsonResponse, type RouteContext, type RouteDefinition } from '../types.js';

/**
 * GET /api/health
 * Simple health check
 */
async function rootHealth(): Promise<Response> {
	return jsonResponse({
		success: true,
		data: {
			status: 'ok'
		}
	});
}

/**
 * GET /api/health/firestore
 * Firestore connectivity check (requires authentication, no collection counts)
 */
async function firestoreHealth(ctx: RouteContext): Promise<Response> {
	// Verify Firestore is reachable with a lightweight operation
	await ctx.firestore.collection(Courses.collectionPath()).count();

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
