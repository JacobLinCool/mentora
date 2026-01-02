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
