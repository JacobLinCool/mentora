/**
 * Wallet/Credits operations (read-only on client)
 */
import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	where,
	type QueryConstraint
} from 'firebase/firestore';
import { Wallets, type LedgerEntry, type Wallet } from 'mentora-firebase';
import {
	failure,
	tryCatch,
	type APIResult,
	type MentoraAPIConfig,
	type QueryOptions
} from './types.js';

import { callBackend } from './backend.js';

export interface CourseWalletResult {
	wallet: Wallet;
	ledger?: LedgerEntry[];
	stats: {
		totalCharges: number;
		transactionCount: number;
	};
}

/**
 * Get a wallet by ID (must be owner)
 */
export async function getWallet(
	config: MentoraAPIConfig,
	walletId: string
): Promise<APIResult<Wallet>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const docRef = doc(config.db, Wallets.docPath(walletId));
		const snapshot = await getDoc(docRef);

		if (!snapshot.exists()) {
			throw new Error('Wallet not found');
		}

		return Wallets.schema.parse(snapshot.data());
	});
}

/**
 * Get current user's wallet
 */
export async function getMyWallet(config: MentoraAPIConfig): Promise<APIResult<Wallet | null>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		// Query for wallet where ownerId == current user and ownerType == "user"
		const q = query(
			collection(config.db, Wallets.collectionPath()),
			where('ownerId', '==', currentUser.uid),
			where('ownerType', '==', 'user'),
			limit(1)
		);
		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			return null;
		}

		return Wallets.schema.parse(snapshot.docs[0].data());
	});
}

/**
 * List ledger entries for a wallet
 */
export async function listWalletEntries(
	config: MentoraAPIConfig,
	walletId: string,
	options?: QueryOptions
): Promise<APIResult<LedgerEntry[]>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

		if (options?.limit) {
			constraints.push(limit(options.limit));
		}

		const q = query(
			collection(config.db, Wallets.entries.collectionPath(walletId)),
			...constraints
		);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => Wallets.entries.schema.parse(doc.data()));
	});
}

/**
 * Get course wallet (host wallet) with optional ledger
 *
 * Now uses direct Firestore query. Stats are not available.
 */
export async function getCourseWallet(
	config: MentoraAPIConfig,
	courseId: string,
	options?: { includeLedger?: boolean; ledgerLimit?: number }
): Promise<APIResult<CourseWalletResult>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const q = query(
			collection(config.db, Wallets.collectionPath()),
			where('ownerId', '==', courseId),
			where('ownerType', '==', 'host'),
			limit(1)
		);
		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			// If wallet doesn't exist, we can't create it from client securely (usually).
			// Return a placeholder or error. For now, throw.
			throw new Error('Wallet not found');
		}

		const wallet = Wallets.schema.parse(snapshot.docs[0].data());

		let ledger: LedgerEntry[] = [];
		if (options?.includeLedger) {
			const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
			constraints.push(limit(options.ledgerLimit || 20));

			const qLedger = query(
				collection(config.db, Wallets.entries.collectionPath(wallet.id)),
				...constraints
			);
			const snapLedger = await getDocs(qLedger);
			ledger = snapLedger.docs.map((d) => Wallets.entries.schema.parse(d.data()));
		}

		return {
			wallet,
			ledger: options?.includeLedger ? ledger : undefined,
			stats: {
				totalCharges: 0, // Not available on client efficiently
				transactionCount: 0
			}
		};
	});
}

/**
 * Add credits to current user's wallet
 *
 * Delegated to backend for payment processing/idempotency.
 */
export async function addCredits(
	config: MentoraAPIConfig,
	amount: number,
	currency: string = 'usd'
): Promise<APIResult<{ id: string }>> {
	return callBackend<{ id: string }>(config, '/api/wallets', {
		method: 'POST',
		body: JSON.stringify({
			action: 'addCredits',
			amount,
			currency
		})
	});
}
