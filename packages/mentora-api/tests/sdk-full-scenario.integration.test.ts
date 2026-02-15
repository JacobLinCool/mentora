import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { APIResult } from '../src/lib/api/types.js';
import type { MentoraClient } from '../src/lib/api/client.js';
import {
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

describe('Mentora SDK Full Scenario (Integration)', () => {
	let teacher: MentoraClient;
	let student: MentoraClient;
	const coursesToCleanup: string[] = [];

	beforeAll(async () => {
		const clients = await setupBothClients();
		teacher = clients.teacher;
		student = clients.student;
	});

	afterAll(async () => {
		for (const courseId of coursesToCleanup.reverse()) {
			await teacher.courses.delete(courseId);
		}
		await teardownAllClients();
	});

	it('runs an end-to-end multi-role workflow across major SDK modules', async () => {
		const studentId = student.currentUser?.uid;
		if (!studentId) {
			throw new Error('Student must be authenticated');
		}

		const courseCode = `SC${Date.now().toString().slice(-6)}`;
		const courseId = mustSucceed(
			await teacher.courses.create(`Scenario Course ${generateTestId()}`, courseCode, {
				visibility: 'private'
			}),
			'create course'
		);
		coursesToCleanup.push(courseId);

		const joinResult = mustSucceed(
			await student.courses.joinByCode(courseCode),
			'student join course'
		);
		expect(joinResult.courseId).toBe(courseId);
		expect(joinResult.joined).toBe(true);

		const roster = mustSucceed(await teacher.courses.getRoster(courseId), 'get roster');
		expect(roster.some((member) => member.userId === studentId)).toBe(true);

		const topicId = mustSucceed(
			await teacher.topics.create({
				courseId,
				title: `Scenario Topic ${generateTestId()}`,
				description: 'Integrated scenario topic',
				order: 1,
				contents: [],
				contentTypes: []
			}),
			'create topic'
		);
		const topic = mustSucceed(await teacher.topics.get(topicId), 'get topic');
		expect(topic.id).toBe(topicId);

		const assignmentId = mustSucceed(
			await teacher.assignments.create({
				courseId,
				topicId,
				title: `Scenario Assignment ${generateTestId()}`,
				question: 'How should we analyze competing arguments?',
				prompt: 'Write a concise argument and at least one counterargument.',
				mode: 'instant',
				startAt: Date.now() - 1_000,
				dueAt: Date.now() + 600_000,
				allowLate: true,
				allowResubmit: true
			}),
			'create assignment'
		);

		mustSucceed(await student.submissions.start(assignmentId), 'start submission');

		const questionnaireId = mustSucceed(
			await teacher.questionnaires.create({
				courseId,
				topicId,
				title: `Scenario Questionnaire ${generateTestId()}`,
				questions: [
					{
						question: {
							type: 'single_answer_choice',
							questionText: 'How ready are you?',
							options: ['Low', 'Medium', 'High']
						},
						required: true
					}
				],
				startAt: Date.now() - 1_000,
				dueAt: null,
				allowLate: true,
				allowResubmit: true
			}),
			'create questionnaire'
		);

		const responseId = mustSucceed(
			await student.questionnaireResponses.submit(
				questionnaireId,
				[
					{
						questionIndex: 0,
						answer: { type: 'single_answer_choice', response: 'Medium' }
					}
				],
				courseId
			),
			'submit questionnaire response'
		);
		expect(responseId).toBe(`${questionnaireId}_${studentId}`);

		const conversation = mustSucceed(
			await student.conversations.create(assignmentId),
			'create conversation'
		);
		expect(conversation.id).toBeDefined();
		const conversationId = conversation.id;

		const passthroughFetch = globalThis.fetch;
		const addTurnFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
			const request =
				input instanceof Request
					? init
						? new Request(input, init)
						: input
					: new Request(input, init);
			const url = new URL(request.url);

			if (url.pathname.endsWith(`/conversations/${conversationId}/turns`)) {
				return new Response(
					JSON.stringify({
						text: 'Mocked assistant response',
						audio: 'ZmFrZS1hdWRpby1kYXRh',
						audioMimeType: 'audio/mp3',
						tokenUsage: {
							byFeature: {
								conversation_llm: {
									inputTokenCount: 10,
									outputTokenCount: 12,
									totalTokenCount: 22
								}
							},
							totals: {
								inputTokenCount: 10,
								outputTokenCount: 12,
								totalTokenCount: 22
							}
						}
					}),
					{
						status: 201,
						headers: { 'content-type': 'application/json' }
					}
				);
			}

			return passthroughFetch(input, init);
		});

		const addTurn = mustSucceed(
			await student.conversations.addTurn(conversationId, { text: 'My first idea is...' }),
			'add conversation turn'
		);
		addTurnFetch.mockRestore();
		expect(addTurn.text).toContain('Mocked assistant response');

		mustSucceed(await student.conversations.end(conversationId), 'end conversation');

		const submissionAfterConversation = mustSucceed(
			await teacher.submissions.get(assignmentId, studentId),
			'teacher get submission after conversation end'
		);
		expect(submissionAfterConversation.state).toBe('submitted');

		const graded = mustSucceed(
			await teacher.submissions.grade(assignmentId, studentId, {
				scoreCompletion: 90,
				notes: 'Clear and structured argument.',
				state: 'graded_complete'
			}),
			'grade submission'
		);
		expect(graded.state).toBe('graded_complete');

		await seedHostWalletWithLedger(courseId, [
			{
				id: `scenario-ledger-${generateTestId()}`,
				type: 'grant',
				amountCredits: 25
			}
		]);
		const courseWallet = mustSucceed(
			await teacher.courses.getWallet(courseId, { includeLedger: true, ledgerLimit: 5 }),
			'get course wallet'
		);
		expect(courseWallet.wallet.ownerType).toBe('host');
		expect(courseWallet.ledger?.length).toBeGreaterThan(0);

		mustSucceed(
			await student.wallets.addCredits({
				amount: 50,
				idempotencyKey: `scenario-wallet-${generateTestId()}`
			}),
			'student add credits'
		);
		const studentWallet = mustSucceed(await student.wallets.getMine(), 'student get mine wallet');
		expect(studentWallet).not.toBeNull();

		const copiedCourseId = mustSucceed(
			await teacher.courses.copy(courseId, {
				title: `Copied Scenario Course ${generateTestId()}`,
				includeContent: true,
				includeRoster: false,
				isDemo: false
			}),
			'copy course'
		);
		coursesToCleanup.push(copiedCourseId);

		mustSucceed(await teacher.courses.delete(copiedCourseId), 'delete copied course');
		coursesToCleanup.splice(coursesToCleanup.indexOf(copiedCourseId), 1);
	});
});
