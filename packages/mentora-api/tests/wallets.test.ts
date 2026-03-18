import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { APIResult } from '../src/lib/api/types.js';
import type { MentoraClient } from '../src/lib/api/client.js';
import {
	createCourseFixture,
	generateTestId,
	seedCourseWallet,
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

	it('getCourseWallet returns null when no wallet exists', async () => {
		const result = await teacher.wallets.getCourseWallet(courseId);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBeNull();
		}
	});

	it('createOrUpdate creates a wallet and getCourseWallet retrieves it', async () => {
		const created = mustSucceed(
			await teacher.wallets.createOrUpdate(courseId, {
				apiKey: 'test-api-key-for-integration',
				spendingLimitUsd: 50
			}),
			'createOrUpdate wallet'
		);
		expect(created.courseId).toBe(courseId);
		expect(created.spendingLimitUsd).toBe(50);

		const fetched = mustSucceed(await teacher.wallets.getCourseWallet(courseId), 'getCourseWallet');
		expect(fetched).not.toBeNull();
		if (fetched) {
			expect(fetched.courseId).toBe(courseId);
			expect(fetched.spendingLimitUsd).toBe(50);
		}
	});
});
