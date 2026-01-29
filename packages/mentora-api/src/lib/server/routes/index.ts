/**
 * Route index - exports all route definitions
 */

export * from './conversations.js';
export * from './courses.js';
export * from './wallets.js';
export * from './health.js';
export * from './topics.js';
export * from './assignments.js';
export * from './utils.js';

import { conversationRoutes } from './conversations.js';
import { courseRoutes } from './courses.js';
import { walletRoutes } from './wallets.js';
import { healthRoutes } from './health.js';
import { topicRoutes } from './topics.js';
import { assignmentRoutes } from './assignments.js';
import type { RouteDefinition } from '../types.js';

/**
 * All route definitions combined
 */
export const allRoutes: RouteDefinition[] = [
	...conversationRoutes,
	...courseRoutes,
	...walletRoutes,
	...healthRoutes,
	...topicRoutes,
	...assignmentRoutes
];
