/**
 * Health check route handlers
 */

import { Assignments, Conversations, Courses, UserProfiles } from 'mentora-firebase';
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
 * Firestore health check with collection counts
 */
async function firestoreHealth(ctx: RouteContext): Promise<Response> {
	const [userCount, courseCount, assignmentCount, conversationCount] = await Promise.all([
		ctx.firestore.collection(UserProfiles.collectionPath()).count(),
		ctx.firestore.collection(Courses.collectionPath()).count(),
		ctx.firestore.collection(Assignments.collectionPath()).count(),
		ctx.firestore.collection(Conversations.collectionPath()).count()
	]);

	return jsonResponse({
		success: true,
		data: {
			user: userCount.data().count,
			course: courseCount.data().count,
			assignment: assignmentCount.data().count,
			conversation: conversationCount.data().count
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
		requireAuth: false // Health checks don't require auth
	}
];

export { rootHealth, firestoreHealth };
