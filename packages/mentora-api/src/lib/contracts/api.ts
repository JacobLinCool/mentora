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

export interface AddCreditsInput {
	amount: number;
	idempotencyKey: string;
	paymentRef?: string | null;
}

export interface AddCreditsResult {
	id: string;
	idempotent: boolean;
	newBalance: number;
}

export interface JoinCourseResult {
	courseId: string;
	joined: boolean;
	alreadyMember?: boolean;
}

export interface CreateResourceResult {
	id: string;
}
