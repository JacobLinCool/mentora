import type { Wallet } from 'mentora-firebase';

export interface AddCreditsParams {
	userId: string;
	amount: number;
	idempotencyKey: string;
	paymentRef: string | null;
}

export interface AddCreditsResult {
	id: string;
	idempotent: boolean;
	newBalance: number;
}

export interface IWalletRepository {
	addCredits(params: AddCreditsParams): Promise<AddCreditsResult>;
	getUserWallet(userId: string): Promise<{ id: string; wallet: Wallet } | null>;
}
