/**
 * Wallet route handlers
 */

import { CreateOrUpdateWalletSchema, ValidateApiKeySchema } from '../llm/schemas.js';
import { HttpStatus, jsonResponse, type RouteContext, type RouteDefinition } from '../types.js';
import { createServiceContainer } from '../application/container.js';
import { parseBody, requireAuth, requireParam } from './utils.js';

/**
 * PUT /api/wallets/:courseId
 * Create or update course wallet
 */
async function createOrUpdateWallet(ctx: RouteContext, request: Request): Promise<Response> {
	requireAuth(ctx);
	const courseId = requireParam(ctx, 'courseId');
	const body = await parseBody(request, CreateOrUpdateWalletSchema);

	const { walletService } = createServiceContainer(ctx);
	const wallet = await walletService.createOrUpdateWallet(courseId, body);
	return jsonResponse(
		{
			courseId: wallet.courseId,
			apiKeyLastFour: wallet.apiKeyLastFour,
			spendingLimitUsd: wallet.spendingLimitUsd,
			totalSpentUsd: wallet.totalSpentUsd,
			status: wallet.status
		},
		HttpStatus.OK
	);
}

/**
 * GET /api/wallets/:courseId
 * Get course wallet (without API key)
 */
async function getWallet(ctx: RouteContext): Promise<Response> {
	requireAuth(ctx);
	const courseId = requireParam(ctx, 'courseId');
	const { walletService } = createServiceContainer(ctx);
	const wallet = await walletService.getWallet(courseId);
	if (!wallet) {
		return jsonResponse(null, HttpStatus.OK);
	}
	return jsonResponse(
		{
			courseId: wallet.courseId,
			apiKeyLastFour: wallet.apiKeyLastFour,
			spendingLimitUsd: wallet.spendingLimitUsd,
			totalSpentUsd: wallet.totalSpentUsd,
			status: wallet.status
		},
		HttpStatus.OK
	);
}

/**
 * POST /api/wallets/validate-key
 * Test if an API key is valid
 */
async function validateKey(ctx: RouteContext, request: Request): Promise<Response> {
	requireAuth(ctx);
	const body = await parseBody(request, ValidateApiKeySchema);
	const { walletService } = createServiceContainer(ctx);
	try {
		await walletService.validateApiKey(body.apiKey);
		return jsonResponse({ valid: true }, HttpStatus.OK);
	} catch {
		return jsonResponse({ valid: false }, HttpStatus.OK);
	}
}

export const walletRoutes: RouteDefinition[] = [
	{
		method: 'PUT',
		pattern: '/wallets/:courseId',
		handler: createOrUpdateWallet,
		requireAuth: true
	},
	{
		method: 'GET',
		pattern: '/wallets/:courseId',
		handler: getWallet,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/wallets/validate-key',
		handler: validateKey,
		requireAuth: true
	}
];

export { createOrUpdateWallet, getWallet, validateKey };
