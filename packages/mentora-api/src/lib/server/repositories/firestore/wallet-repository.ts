import { createHash } from 'node:crypto';
import type { Firestore } from 'fires2rest';
import { Wallets, type LedgerEntry, type Wallet } from 'mentora-firebase';
import type {
	AddCreditsParams,
	AddCreditsResult,
	IWalletRepository
} from '../ports/wallet-repository.js';

function idempotencyEntryId(idempotencyKey: string): string {
	return `idemp_${createHash('sha256').update(idempotencyKey).digest('hex')}`;
}

type FirestoreDocSnapshot = {
	exists: boolean;
	data(): unknown;
};

type FirestoreTransaction = {
	get(ref: unknown): Promise<FirestoreDocSnapshot>;
	set(ref: unknown, data: unknown): void;
	update(ref: unknown, data: unknown): void;
};

export class FirestoreWalletRepository implements IWalletRepository {
	constructor(private readonly firestore: Firestore) {}

	async addCredits(params: AddCreditsParams): Promise<AddCreditsResult> {
		const walletId = `wallet_${params.userId}`;
		const walletRef = this.firestore.doc(Wallets.docPath(walletId));
		const entryRef = this.firestore
			.collection(Wallets.entries.collectionPath(walletId))
			.doc(idempotencyEntryId(params.idempotencyKey));

		const result = await this.firestore.runTransaction(
			async (transaction: FirestoreTransaction) => {
				const now = Date.now();

				const walletDoc = await transaction.get(walletRef);
				let currentBalance = 0;
				if (!walletDoc.exists) {
					transaction.set(walletRef, {
						ownerType: 'user',
						ownerId: params.userId,
						balanceCredits: 0,
						createdAt: now,
						updatedAt: now
					});
				} else {
					const wallet = Wallets.schema.parse(walletDoc.data());
					currentBalance = wallet.balanceCredits;
				}

				const existingEntryDoc = await transaction.get(entryRef);
				if (existingEntryDoc.exists) {
					return {
						id: entryRef.id,
						idempotent: true,
						newBalance: currentBalance
					};
				}

				const entry: LedgerEntry = {
					type: 'topup',
					amountCredits: params.amount,
					idempotencyKey: params.idempotencyKey,
					scope: {
						courseId: null,
						topicId: null,
						assignmentId: null,
						conversationId: null
					},
					provider: {
						name: params.paymentRef ? 'payment' : 'manual',
						ref: params.paymentRef
					},
					metadata: null,
					createdBy: params.userId,
					createdAt: now
				};

				const newBalance = currentBalance + params.amount;
				transaction.update(walletRef, {
					balanceCredits: newBalance,
					updatedAt: now
				});
				transaction.set(entryRef, Wallets.entries.schema.parse(entry));

				return {
					id: entryRef.id,
					idempotent: false,
					newBalance
				};
			}
		);

		return result as AddCreditsResult;
	}

	async getUserWallet(userId: string): Promise<{ id: string; wallet: Wallet } | null> {
		const snapshot = await this.firestore
			.collection(Wallets.collectionPath())
			.where('ownerId', '==', userId)
			.where('ownerType', '==', 'user')
			.limit(1)
			.get();

		if (snapshot.empty) {
			return null;
		}
		const doc = snapshot.docs[0];
		return {
			id: doc.id,
			wallet: Wallets.schema.parse(doc.data())
		};
	}
}
