/**
 * Course wallet operations (via backend API)
 */
import { failure, type APIResult, type MentoraAPIConfig } from './types.js';
import { callBackend } from './backend.js';

export interface WalletDisplayInfo {
	courseId: string;
	apiKeyLastFour: string;
	spendingLimitUsd: number;
	totalSpentUsd: number;
	status: string;
}

/**
 * Get course wallet info (without API key)
 */
export async function getCourseWallet(
	config: MentoraAPIConfig,
	courseId: string
): Promise<APIResult<WalletDisplayInfo | null>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) return failure('Not authenticated');
	return callBackend<WalletDisplayInfo | null>(config, `/wallets/${courseId}`);
}

/**
 * Create or update course wallet (via backend)
 */
export async function createOrUpdateWallet(
	config: MentoraAPIConfig,
	courseId: string,
	input: { apiKey: string; spendingLimitUsd: number }
): Promise<APIResult<WalletDisplayInfo>> {
	return callBackend<WalletDisplayInfo>(config, `/wallets/${courseId}`, {
		method: 'PUT',
		body: JSON.stringify(input)
	});
}

/**
 * Validate an API key (via backend)
 */
export async function validateApiKey(
	config: MentoraAPIConfig,
	apiKey: string
): Promise<APIResult<{ valid: boolean }>> {
	return callBackend<{ valid: boolean }>(config, '/wallets/validate-key', {
		method: 'POST',
		body: JSON.stringify({ apiKey })
	});
}
