import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { APIResult } from '../src/lib/api/types.js';
import type { MentoraClient } from '../src/lib/api/client.js';
import {
	createCourseFixture,
	createQuestionnaireFixture,
	setupBothClients,
	teardownAllClients
} from './emulator-setup.js';

function mustSucceed<T>(result: APIResult<T>, label: string): T {
	if (!result.success) {
		throw new Error(`${label} failed: ${result.error}`);
	}
	return result.data;
}

describe('Questionnaire Responses Module (Integration)', () => {
	let teacher: MentoraClient;
	let student: MentoraClient;
	let courseId: string;
	let questionnaireId: string;
	let studentId: string;

	beforeAll(async () => {
		const clients = await setupBothClients();
		teacher = clients.teacher;
		student = clients.student;

		const fixture = await createCourseFixture(teacher, student, {
			visibility: 'private'
		});
		courseId = fixture.courseId;

		const questionnaireFixture = await createQuestionnaireFixture(teacher, courseId);
		questionnaireId = questionnaireFixture.questionnaireId;

		const uid = student.currentUser?.uid;
		if (!uid) {
			throw new Error('Student authentication not ready');
		}
		studentId = uid;
	});

	afterAll(async () => {
		if (courseId) {
			await teacher.courses.delete(courseId);
		}
		await teardownAllClients();
	});

	it('covers submit/get/list/update/delete and fixed response document id', async () => {
		const initialResponses = [
			{
				questionIndex: 0,
				answer: {
					type: 'single_answer_choice' as const,
					response: 'High'
				}
			},
			{
				questionIndex: 1,
				answer: {
					type: 'short_answer' as const,
					response: 'I want to improve my critical thinking.'
				}
			}
		];

		const submitDocId = mustSucceed(
			await student.questionnaireResponses.submit(questionnaireId, initialResponses, courseId),
			'submit response'
		);
		expect(submitDocId).toBe(`${questionnaireId}_${studentId}`);

		const mine = mustSucceed(
			await student.questionnaireResponses.getMine(questionnaireId),
			'get mine'
		);
		expect(mine).not.toBeNull();
		if (!mine) {
			throw new Error('Expected submitted response to exist');
		}
		expect(mine.userId).toBe(studentId);
		expect(mine.questionnaireId).toBe(questionnaireId);
		expect(mine.courseId).toBe(courseId);

		const listMine = mustSucceed(
			await student.questionnaireResponses.listMine({ limit: 10 }),
			'list mine'
		);
		expect(listMine.some((item) => item.questionnaireId === questionnaireId)).toBe(true);

		const teacherGet = mustSucceed(
			await teacher.questionnaireResponses.get(questionnaireId, studentId),
			'teacher get student response'
		);
		expect(teacherGet.userId).toBe(studentId);

		const teacherList = mustSucceed(
			await teacher.questionnaireResponses.listForQuestionnaire(questionnaireId, {
				limit: 10
			}),
			'teacher list questionnaire responses'
		);
		expect(teacherList.some((item) => item.userId === studentId)).toBe(true);

		const updated = mustSucceed(
			await student.questionnaireResponses.updateMine(questionnaireId, [
				{
					questionIndex: 0,
					answer: {
						type: 'single_answer_choice',
						response: 'Medium'
					}
				},
				{
					questionIndex: 1,
					answer: {
						type: 'short_answer',
						response: 'I want more examples and practice.'
					}
				}
			]),
			'update mine'
		);
		expect(updated.responses[0].answer.type).toBe('single_answer_choice');
		expect(updated.responses[0].answer.response).toBe('Medium');

		mustSucceed(
			await teacher.questionnaireResponses.delete(questionnaireId, studentId),
			'delete response'
		);

		const deleted = mustSucceed(
			await student.questionnaireResponses.getMine(questionnaireId),
			'get mine after delete'
		);
		expect(deleted).toBeNull();
	});
});
