import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { APIResult } from '../src/lib/api/types.js';
import type { MentoraClient } from '../src/lib/api/client.js';
import {
	createCourseFixture,
	generateTestId,
	seedHostWalletWithLedger,
	setupBothClients,
	teardownAllClients
} from './emulator-setup.js';

function mustSucceed<T>(result: APIResult<T>, label: string): T {
	if (!result.success) {
		throw new Error(`${label} failed: ${result.error}`);
	}
	return result.data;
}

describe('Wallets Module (Integration)', () => {
	let teacher: MentoraClient;
	let student: MentoraClient;
	let courseId: string;

	beforeAll(async () => {
		const clients = await setupBothClients();
		teacher = clients.teacher;
		student = clients.student;

		const fixture = await createCourseFixture(teacher, student, {
			visibility: 'private'
		});
		courseId = fixture.courseId;
	});

	afterAll(async () => {
		if (courseId) {
			await teacher.courses.delete(courseId);
		}
		await teardownAllClients();
	});

	it('covers addCredits idempotency, getMine, get, and listEntries', async () => {
		const idempotencyKey = `wallet-idempotency-${generateTestId()}`;

		const firstTopup = mustSucceed(
			await teacher.wallets.addCredits({
				amount: 120,
				idempotencyKey,
				paymentRef: 'pi_wallet_integration_test'
			}),
			'first addCredits'
		);
		expect(firstTopup.idempotent).toBe(false);
		expect(firstTopup.newBalance).toBeGreaterThan(0);

		const secondTopup = mustSucceed(
			await teacher.wallets.addCredits({
				amount: 120,
				idempotencyKey,
				paymentRef: 'pi_wallet_integration_test'
			}),
			'second addCredits'
		);
		expect(secondTopup.idempotent).toBe(true);
		expect(secondTopup.id).toBe(firstTopup.id);
		expect(secondTopup.newBalance).toBe(firstTopup.newBalance);

		const myWallet = mustSucceed(await teacher.wallets.getMine(), 'getMine');
		expect(myWallet).not.toBeNull();
		if (!myWallet) {
			throw new Error('Expected user wallet to exist after addCredits');
		}

		const byId = mustSucceed(await teacher.wallets.get(myWallet.id), 'get wallet by id');
		expect(byId.id).toBe(myWallet.id);
		expect(byId.ownerType).toBe('user');

		const entries = mustSucceed(
			await teacher.wallets.listEntries(myWallet.id, { limit: 10 }),
			'list wallet entries'
		);
		expect(entries.length).toBeGreaterThan(0);
		expect(entries.some((entry) => entry.id === firstTopup.id)).toBe(true);
	});

	it('covers course host wallet retrieval with ledger and missing wallet failure', async () => {
		const seeded = await seedHostWalletWithLedger(courseId, [
			{
				id: `ledger-${generateTestId()}-grant`,
				type: 'grant',
				amountCredits: 50
			},
			{
				id: `ledger-${generateTestId()}-charge`,
				type: 'charge',
				amountCredits: -15
			}
		]);

		const courseWallet = mustSucceed(
			await teacher.courses.getWallet(courseId, {
				includeLedger: true,
				ledgerLimit: 10
			}),
			'courses.getWallet include ledger'
		);
		expect(courseWallet.wallet.id).toBe(seeded.walletId);
		expect(courseWallet.wallet.ownerType).toBe('host');
		expect(courseWallet.wallet.ownerId).toBe(courseId);
		expect(courseWallet.ledger).toBeDefined();
		expect(courseWallet.ledger?.length).toBe(2);

		const emptyCourseId = mustSucceed(
			await teacher.courses.create(
				`Wallet Empty Course ${generateTestId()}`,
				`WC${Date.now().toString().slice(-6)}`,
				{ visibility: 'private' }
			),
			'create empty wallet course'
		);

		const missingCourseWallet = await teacher.courses.getWallet(emptyCourseId, {
			includeLedger: true
		});
		expect(missingCourseWallet.success).toBe(false);
		if (!missingCourseWallet.success) {
			expect(missingCourseWallet.error).toContain('Wallet not found');
		}

		mustSucceed(await teacher.courses.delete(emptyCourseId), 'delete empty wallet course');
	});
});
