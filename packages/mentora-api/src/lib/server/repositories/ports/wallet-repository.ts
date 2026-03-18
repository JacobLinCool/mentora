import type { Wallet, WalletStatus } from 'mentora-firebase';

export interface IWalletRepository {
	getWallet(courseId: string): Promise<Wallet | null>;
	createWallet(courseId: string, wallet: Wallet): Promise<void>;
	updateWallet(
		courseId: string,
		updates: Partial<
			Pick<Wallet, 'apiKey' | 'apiKeyLastFour' | 'spendingLimitUsd' | 'status' | 'updatedAt'>
		>
	): Promise<void>;
	incrementSpend(courseId: string, amountUsd: number): Promise<void>;
	getWalletStatus(
		courseId: string
	): Promise<{ status: WalletStatus; totalSpentUsd: number; spendingLimitUsd: number } | null>;
}
