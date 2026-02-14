import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { APIResult } from '../src/lib/api/types.js';
import type { MentoraClient } from '../src/lib/api/client.js';
import {
	createCourseFixture,
	generateTestId,
	setupBothClients,
	teardownAllClients
} from './emulator-setup.js';

function mustSucceed<T>(result: APIResult<T>, label: string): T {
	if (!result.success) {
		throw new Error(`${label} failed: ${result.error}`);
	}
	return result.data;
}

describe('Questionnaires Module (Integration)', () => {
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

	it('covers create/get/list/listAvailable/update/delete for course questionnaires', async () => {
		const now = Date.now();
		const availableQuestionnaireId = mustSucceed(
			await teacher.questionnaires.create({
				courseId,
				topicId: null,
				title: `Q available ${generateTestId()}`,
				questions: [
					{
						question: {
							type: 'single_answer_choice',
							questionText: 'How confident are you?',
							options: ['Low', 'Medium', 'High']
						},
						required: true
					}
				],
				startAt: now - 5_000,
				dueAt: null,
				allowLate: true,
				allowResubmit: true
			}),
			'create available questionnaire'
		);

		const upcomingQuestionnaireId = mustSucceed(
			await teacher.questionnaires.create({
				courseId,
				topicId: null,
				title: `Q upcoming ${generateTestId()}`,
				questions: [
					{
						question: {
							type: 'short_answer',
							questionText: 'Why do you want to learn this topic?'
						},
						required: true
					}
				],
				startAt: now + 60_000,
				dueAt: null,
				allowLate: false,
				allowResubmit: false
			}),
			'create upcoming questionnaire'
		);

		const fetched = mustSucceed(
			await teacher.questionnaires.get(availableQuestionnaireId),
			'get questionnaire'
		);
		expect(fetched.id).toBe(availableQuestionnaireId);
		expect(fetched.courseId).toBe(courseId);

		const listed = mustSucceed(
			await teacher.questionnaires.listForCourse(courseId, { limit: 10 }),
			'list for course'
		);
		expect(listed.some((item) => item.id === availableQuestionnaireId)).toBe(true);
		expect(listed.some((item) => item.id === upcomingQuestionnaireId)).toBe(true);

		const availableOnly = mustSucceed(
			await student.questionnaires.listAvailable(courseId, { limit: 10 }),
			'list available'
		);
		expect(availableOnly.some((item) => item.id === availableQuestionnaireId)).toBe(true);
		expect(availableOnly.some((item) => item.id === upcomingQuestionnaireId)).toBe(false);

		const updated = mustSucceed(
			await teacher.questionnaires.update(availableQuestionnaireId, {
				title: `Q updated ${generateTestId()}`
			}),
			'update questionnaire'
		);
		expect(updated.id).toBe(availableQuestionnaireId);
		expect(updated.title.startsWith('Q updated')).toBe(true);

		mustSucceed(
			await teacher.questionnaires.delete(upcomingQuestionnaireId),
			'delete questionnaire'
		);

		const deletedGet = await teacher.questionnaires.get(upcomingQuestionnaireId);
		expect(deletedGet.success).toBe(false);
		if (!deletedGet.success) {
			expect(deletedGet.error).toContain('Questionnaire not found');
		}
	});
});
