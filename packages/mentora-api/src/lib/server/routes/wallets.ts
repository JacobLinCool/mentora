/**
 * Wallet route handlers
 */

import { AddCreditsSchema } from '../llm/schemas.js';
import { HttpStatus, jsonResponse, type RouteContext, type RouteDefinition } from '../types.js';
import { createServiceContainer } from '../application/container.js';
import { parseBody, requireAuth } from './utils.js';

/**
 * POST /api/wallets
 * Add credits to current user's wallet
 */
async function addCredits(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = await parseBody(request, AddCreditsSchema);

	const { walletService } = createServiceContainer(ctx);
	const result = await walletService.addCredits(user.uid, body);
	if (result.idempotent) {
		return jsonResponse(result, HttpStatus.OK);
	}
	return jsonResponse(result, HttpStatus.CREATED);
}

/**
 * GET /api/wallets/me
 * Get current user's wallet
 */
async function getMyWallet(ctx: RouteContext): Promise<Response> {
	const user = requireAuth(ctx);
	const { walletService } = createServiceContainer(ctx);
	const result = await walletService.getMyWallet(user.uid);
	if (!result) {
		return jsonResponse(null, HttpStatus.OK);
	}
	return jsonResponse(
		{
			id: result.id,
			...result.wallet
		},
		HttpStatus.OK
	);
}

/**
 * Export route definitions
 */
export const walletRoutes: RouteDefinition[] = [
	{
		method: 'GET',
		pattern: '/wallets/me',
		handler: getMyWallet,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/wallets',
		handler: addCredits,
		requireAuth: true
	}
];

export { addCredits, getMyWallet };
