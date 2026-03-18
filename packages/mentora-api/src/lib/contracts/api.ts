/**
 * Cross-layer API contracts shared by server and client SDK.
 *
 * Keep these interfaces transport-oriented and stable.
 */

export interface DelegatedListOptions {
	limit?: number;
}

export interface CreateConversationResult {
	id: string;
	created: boolean;
	reopened: boolean;
}

export interface CreateOrUpdateWalletInput {
	apiKey: string;
	spendingLimitUsd: number;
}

export interface WalletResponse {
	courseId: string;
	apiKeyLastFour: string;
	spendingLimitUsd: number;
	totalSpentUsd: number;
	status: string;
}

export interface ValidateApiKeyInput {
	apiKey: string;
}

export interface JoinCourseResult {
	courseId: string;
	joined: boolean;
	alreadyMember?: boolean;
}

export interface CreateResourceResult {
	id: string;
}
