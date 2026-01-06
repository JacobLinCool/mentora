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

export interface CourseWalletResult {
	wallet: Wallet;
	ledger?: LedgerEntry[];
	stats: {
		totalCharges: number;
		transactionCount: number;
	};
}

export interface AddCreditsResult {
	entry: LedgerEntry;
	newBalance: number;
	message?: string;
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
 * Get course wallet (host wallet) with optional ledger and stats
 *
 * Delegated to backend to handle secure creation and stats.
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
		const token = await currentUser.getIdToken();

		const params = new URLSearchParams();
		if (options?.includeLedger) params.append('includeLedger', 'true');
		if (options?.ledgerLimit) params.append('ledgerLimit', options.ledgerLimit.toString());

		const response = await fetch(
			`${config.backendBaseUrl}/api/courses/${courseId}/wallet?${params.toString()}`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		);

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Failed to get wallet' }));
			throw new Error(error.message || `Failed to get wallet: ${response.status}`);
		}

		return await response.json();
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
): Promise<APIResult<AddCreditsResult>> {
	const currentUser = config.getCurrentUser();
	if (!currentUser) {
		return failure('Not authenticated');
	}

	return tryCatch(async () => {
		const token = await currentUser.getIdToken();

		const response = await fetch(`${config.backendBaseUrl}/api/wallets`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				action: 'addCredits',
				amount,
				currency
			})
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Failed to add credits' }));
			throw new Error(error.message || `Failed to add credits: ${response.status}`);
		}

		return await response.json();
	});
}
