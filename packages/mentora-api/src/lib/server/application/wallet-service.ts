import { GoogleGenAI } from '@google/genai';
import type { Wallet, WalletStatus } from 'mentora-firebase';
import { errorResponse, HttpStatus, ServerErrorCode } from '../types.js';
import type { IWalletRepository } from '../repositories/ports/wallet-repository.js';

export class WalletService {
	constructor(private readonly walletRepository: IWalletRepository) {}

	async getWallet(courseId: string): Promise<Wallet | null> {
		return this.walletRepository.getWallet(courseId);
	}

	async createOrUpdateWallet(
		courseId: string,
		input: { apiKey: string; spendingLimitUsd: number }
	): Promise<Wallet> {
		await this.validateApiKey(input.apiKey);

		const existing = await this.walletRepository.getWallet(courseId);
		const now = Date.now();
		const apiKeyLastFour = input.apiKey.slice(-4);

		if (existing) {
			let newStatus: WalletStatus = 'active';
			if (existing.totalSpentUsd >= input.spendingLimitUsd) {
				newStatus = 'suspended';
			}

			await this.walletRepository.updateWallet(courseId, {
				apiKey: input.apiKey,
				apiKeyLastFour,
				spendingLimitUsd: input.spendingLimitUsd,
				status: newStatus,
				updatedAt: now
			});

			return {
				...existing,
				apiKey: input.apiKey,
				apiKeyLastFour,
				spendingLimitUsd: input.spendingLimitUsd,
				status: newStatus,
				updatedAt: now
			};
		}

		const wallet: Wallet = {
			courseId,
			apiKey: input.apiKey,
			apiKeyLastFour,
			spendingLimitUsd: input.spendingLimitUsd,
			totalSpentUsd: 0,
			status: 'active',
			createdAt: now,
			updatedAt: now
		};

		await this.walletRepository.createWallet(courseId, wallet);
		return wallet;
	}

	async validateApiKey(apiKey: string): Promise<void> {
		try {
			const genai = new GoogleGenAI({ apiKey });
			await genai.models.list({ pageSize: 1 });
		} catch {
			throw errorResponse(
				'Invalid API key or unable to connect to Gemini API',
				HttpStatus.BAD_REQUEST,
				ServerErrorCode.INVALID_INPUT
			);
		}
	}

	async recordSpend(courseId: string, amountUsd: number): Promise<void> {
		await this.walletRepository.incrementSpend(courseId, amountUsd);

		const status = await this.walletRepository.getWalletStatus(courseId);
		if (status && status.totalSpentUsd >= status.spendingLimitUsd) {
			await this.walletRepository.updateWallet(courseId, {
				status: 'suspended',
				updatedAt: Date.now()
			});
		}
	}

	async markInvalidKey(courseId: string): Promise<void> {
		await this.walletRepository.updateWallet(courseId, {
			status: 'invalid_key',
			updatedAt: Date.now()
		});
	}
}
