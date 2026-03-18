import { FieldValue, type Firestore } from 'fires2rest';
import { Wallets, type Wallet, type WalletStatus } from 'mentora-firebase';
import type { IWalletRepository } from '../ports/wallet-repository.js';

export class FirestoreWalletRepository implements IWalletRepository {
	constructor(private readonly firestore: Firestore) {}

	async getWallet(courseId: string): Promise<Wallet | null> {
		const docRef = this.firestore.doc(Wallets.docPath(courseId));
		const snapshot = await docRef.get();
		if (!snapshot.exists) return null;
		return Wallets.schema.parse(snapshot.data());
	}

	async createWallet(courseId: string, wallet: Wallet): Promise<void> {
		const docRef = this.firestore.doc(Wallets.docPath(courseId));
		await docRef.set(Wallets.schema.parse(wallet) as unknown as Record<string, unknown>);
	}

	async updateWallet(
		courseId: string,
		updates: Partial<
			Pick<Wallet, 'apiKey' | 'apiKeyLastFour' | 'spendingLimitUsd' | 'status' | 'updatedAt'>
		>
	): Promise<void> {
		const docRef = this.firestore.doc(Wallets.docPath(courseId));
		await docRef.update(updates as Record<string, unknown>);
	}

	async incrementSpend(courseId: string, amountUsd: number): Promise<void> {
		const docRef = this.firestore.doc(Wallets.docPath(courseId));
		await docRef.update({
			totalSpentUsd: FieldValue.increment(amountUsd),
			updatedAt: Date.now()
		});
	}

	async getWalletStatus(
		courseId: string
	): Promise<{ status: WalletStatus; totalSpentUsd: number; spendingLimitUsd: number } | null> {
		const wallet = await this.getWallet(courseId);
		if (!wallet) return null;
		return {
			status: wallet.status,
			totalSpentUsd: wallet.totalSpentUsd,
			spendingLimitUsd: wallet.spendingLimitUsd
		};
	}
}
