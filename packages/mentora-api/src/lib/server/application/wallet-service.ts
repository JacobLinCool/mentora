import type { AddCreditsInput, AddCreditsResult } from '../../contracts/api.js';
import { errorResponse, HttpStatus, ServerErrorCode } from '../types.js';
import type { IWalletRepository } from '../repositories/ports/wallet-repository.js';

export interface TopupVerificationGateway {
	verify(params: { amount: number; paymentRef: string | null; userId: string }): Promise<boolean>;
}

export class DefaultTopupVerificationGateway implements TopupVerificationGateway {
	async verify(params: {
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
}

export class WalletService {
	constructor(
		private readonly walletRepository: IWalletRepository,
		private readonly verificationGateway: TopupVerificationGateway
	) {}

	async addCredits(userId: string, input: AddCreditsInput): Promise<AddCreditsResult> {
		const verified = await this.verificationGateway.verify({
			amount: input.amount,
			paymentRef: input.paymentRef ?? null,
			userId
		});
		if (!verified) {
			throw errorResponse(
				'Payment verification failed',
				HttpStatus.BAD_REQUEST,
				ServerErrorCode.INVALID_INPUT
			);
		}

		return this.walletRepository.addCredits({
			userId,
			amount: input.amount,
			idempotencyKey: input.idempotencyKey,
			paymentRef: input.paymentRef ?? null
		});
	}

	async getMyWallet(userId: string) {
		return this.walletRepository.getUserWallet(userId);
	}
}
