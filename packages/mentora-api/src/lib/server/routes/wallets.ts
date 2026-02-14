/**
 * Wallet route handlers
 */

import { Wallets, type LedgerEntry } from 'mentora-firebase';
import { AddCreditsSchema } from '../llm/schemas.js';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { parseBody, requireAuth } from './utils.js';
import { createHash } from 'node:crypto';

function idempotencyEntryId(idempotencyKey: string): string {
	return `idemp_${createHash('sha256').update(idempotencyKey).digest('hex')}`;
}

async function verifyTopupPayment(params: {
	amount: number;
	paymentRef: string | null;
	userId: string;
}): Promise<boolean> {
	if (!Number.isFinite(params.amount) || params.amount <= 0) {
		return false;
	}
	if (params.paymentRef != null && params.paymentRef.trim().length === 0) {
		return false;
	}
	// Placeholder for payment-provider verification integration.
	return true;
}

/**
 * POST /api/wallets
 * Add credits to current user's wallet
 *
 * Uses a Firestore transaction to prevent race conditions:
 * - Atomic wallet creation if not exists
 * - Atomic balance update
 * - Idempotency check within transaction
 */
async function addCredits(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = await parseBody(request, AddCreditsSchema);
	const { amount, paymentRef, idempotencyKey } = body;

	const paymentVerified = await verifyTopupPayment({
		amount,
		paymentRef,
		userId: user.uid
	});
	if (!paymentVerified) {
		return errorResponse(
			'Payment verification failed',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	// Use deterministic wallet ID based on user UID
	const walletId = `wallet_${user.uid}`;
	const walletRef = ctx.firestore.doc(Wallets.docPath(walletId));
	const entryRef = ctx.firestore
		.collection(Wallets.entries.collectionPath(walletId))
		.doc(idempotencyEntryId(idempotencyKey));

	// Run transaction for atomic read-modify-write
	const result = await ctx.firestore.runTransaction(async (transaction) => {
		const now = Date.now();

		// 1. Get or create wallet atomically
		const walletDoc = await transaction.get(walletRef);
		let currentBalance = 0;

		if (!walletDoc.exists) {
			transaction.set(walletRef, {
				ownerType: 'user',
				ownerId: user.uid,
				balanceCredits: 0,
				createdAt: now,
				updatedAt: now
			});
			currentBalance = 0;
		} else {
			const walletData = Wallets.schema.parse(walletDoc.data());
			currentBalance = walletData.balanceCredits;
		}

		// 2. Check idempotency within transaction
		const existingEntryDoc = await transaction.get(entryRef);
		if (existingEntryDoc.exists) {
			return {
				isIdempotent: true,
				id: entryRef.id,
				newBalance: currentBalance
			};
		}

		// 3. Create ledger entry
		const entryId = entryRef.id;

		const entry: LedgerEntry = {
			type: 'topup',
			amountCredits: amount,
			idempotencyKey,
			scope: {
				courseId: null,
				topicId: null,
				assignmentId: null,
				conversationId: null
			},
			provider: {
				name: paymentRef ? 'payment' : 'manual',
				ref: paymentRef ?? null
			},
			metadata: null,
			createdBy: user.uid,
			createdAt: now
		};

		const validatedEntry = Wallets.entries.schema.parse(entry);

		// 4. Update wallet balance atomically
		const newBalance = currentBalance + amount;

		transaction.update(walletRef, {
			balanceCredits: newBalance,
			updatedAt: now
		});

		// 5. Save ledger entry
		transaction.set(entryRef, validatedEntry);

		return {
			isIdempotent: false,
			id: entryId,
			newBalance
		};
	});

	// Return appropriate response
	if (result.isIdempotent) {
		return jsonResponse({
			id: result.id,
			idempotent: true,
			newBalance: result.newBalance
		});
	}

	return jsonResponse(
		{ id: result.id, idempotent: false, newBalance: result.newBalance },
		HttpStatus.CREATED
	);
}

/**
 * GET /api/wallets/me
 * Get current user's wallet
 */
async function getMyWallet(ctx: RouteContext): Promise<Response> {
	const user = requireAuth(ctx);

	// Query for user's wallet
	const snapshot = await ctx.firestore
		.collection(Wallets.collectionPath())
		.where('ownerId', '==', user.uid)
		.where('ownerType', '==', 'user')
		.limit(1)
		.get();

	if (snapshot.empty) {
		// Return null if no wallet exists
		return jsonResponse(null);
	}

	const doc = snapshot.docs[0];
	const walletData = Wallets.schema.parse(doc.data());

	return jsonResponse({
		id: doc.id,
		...walletData
	});
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
