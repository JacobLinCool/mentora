import { describe, expect, it } from 'vitest';
import {
	createAssignment,
	generateContent,
	listAvailableAssignments,
	listCourseAssignments
} from '../src/lib/api/assignments.js';
import { listMyConversations, getAssignmentConversation } from '../src/lib/api/conversations.js';
import {
	createCourse,
	createAnnouncement,
	copyCourse,
	inviteMember,
	listAllEnrolledCourses,
	listMyCourses,
	listMyEnrolledCourses,
	removeMember,
	updateMember
} from '../src/lib/api/courses.js';
import {
	getMyQuestionnaireResponse,
	listMyQuestionnaireResponses,
	submitQuestionnaireResponse,
	updateMyQuestionnaireResponse
} from '../src/lib/api/questionnaireResponses.js';
import {
	createQuestionnaire,
	listAvailableQuestionnaires,
	listCourseQuestionnaires
} from '../src/lib/api/questionnaires.js';
import { getMySubmission, startSubmission, submitAssignment } from '../src/lib/api/submissions.js';
import { createTopic, listCourseTopics } from '../src/lib/api/topics.js';
import { getMyProfile, updateMyProfile } from '../src/lib/api/users.js';
import {
	getCourseWallet,
	getMyWallet,
	getWallet,
	listWalletEntries
} from '../src/lib/api/wallets.js';
import type { APIResult, MentoraAPIConfig } from '../src/lib/api/types.js';

function expectFailure<T>(result: APIResult<T>): void {
	expect(result.success).toBe(false);
	if (!result.success) {
		expect(result.error).toBe('Not authenticated');
	}
}

const unauthConfig: MentoraAPIConfig = {
	auth: {} as MentoraAPIConfig['auth'],
	db: {} as MentoraAPIConfig['db'],
	backendBaseUrl: 'http://api.test',
	environment: { browser: false },
	getCurrentUser: () => null
};

describe('API unauthenticated guards', () => {
	describe('assignments', () => {
		it('listCourseAssignments rejects unauthenticated', async () => {
			expectFailure(await listCourseAssignments(unauthConfig, 'course-1'));
		});

		it('listAvailableAssignments rejects unauthenticated', async () => {
			expectFailure(await listAvailableAssignments(unauthConfig, 'course-1'));
		});

		it('createAssignment rejects unauthenticated', async () => {
			expectFailure(
				await createAssignment(unauthConfig, {
					courseId: 'course-1',
					topicId: null,
					title: 'Assignment',
					question: 'Question',
					prompt: 'Prompt',
					mode: 'instant',
					startAt: Date.now(),
					dueAt: null,
					allowLate: true,
					allowResubmit: true
				})
			);
		});

		it('generateContent rejects unauthenticated', async () => {
			expectFailure(await generateContent(unauthConfig, 'What is justice?'));
		});
	});

	describe('questionnaires', () => {
		it('listCourseQuestionnaires rejects unauthenticated', async () => {
			expectFailure(await listCourseQuestionnaires(unauthConfig, 'course-1'));
		});

		it('listAvailableQuestionnaires rejects unauthenticated', async () => {
			expectFailure(await listAvailableQuestionnaires(unauthConfig, 'course-1'));
		});

		it('createQuestionnaire rejects unauthenticated', async () => {
			expectFailure(
				await createQuestionnaire(unauthConfig, {
					courseId: 'course-1',
					topicId: null,
					title: 'Questionnaire',
					questions: [
						{
							question: { type: 'short_answer', questionText: 'How are you?' },
							required: true
						}
					],
					startAt: Date.now(),
					dueAt: null,
					allowLate: true,
					allowResubmit: true
				})
			);
		});
	});

	describe('topics', () => {
		it('listCourseTopics rejects unauthenticated', async () => {
			expectFailure(await listCourseTopics(unauthConfig, 'course-1'));
		});

		it('createTopic rejects unauthenticated', async () => {
			expectFailure(
				await createTopic(unauthConfig, {
					courseId: 'course-1',
					title: 'Topic',
					description: null,
					order: 1,
					contents: [],
					contentTypes: []
				})
			);
		});
	});

	describe('courses', () => {
		it('createCourse rejects unauthenticated', async () => {
			expectFailure(await createCourse(unauthConfig, 'Course', 'CODE123'));
		});

		it('copyCourse rejects unauthenticated', async () => {
			expectFailure(
				await copyCourse(unauthConfig, 'course-1', {
					title: 'copy',
					includeContent: true
				})
			);
		});

		it('listMyCourses rejects unauthenticated', async () => {
			expectFailure(await listMyCourses(unauthConfig));
		});

		it('listMyEnrolledCourses rejects unauthenticated', async () => {
			expectFailure(await listMyEnrolledCourses(unauthConfig));
		});

		it('inviteMember rejects unauthenticated', async () => {
			expectFailure(await inviteMember(unauthConfig, 'course-1', 'a@test.local'));
		});

		it('listAllEnrolledCourses rejects unauthenticated', async () => {
			expectFailure(await listAllEnrolledCourses(unauthConfig));
		});

		it('updateMember rejects unauthenticated', async () => {
			expectFailure(await updateMember(unauthConfig, 'course-1', 'member-1', { role: 'ta' }));
		});

		it('removeMember rejects unauthenticated', async () => {
			expectFailure(await removeMember(unauthConfig, 'course-1', 'member-1'));
		});

		it('createAnnouncement rejects unauthenticated', async () => {
			expectFailure(await createAnnouncement(unauthConfig, 'course-1', 'notice'));
		});
	});

	describe('conversations', () => {
		it('listMyConversations rejects unauthenticated', async () => {
			expectFailure(await listMyConversations(unauthConfig));
		});

		it('getAssignmentConversation rejects unauthenticated', async () => {
			expectFailure(await getAssignmentConversation(unauthConfig, 'assignment-1'));
		});
	});

	describe('questionnaireResponses', () => {
		it('listMyQuestionnaireResponses rejects unauthenticated', async () => {
			expectFailure(await listMyQuestionnaireResponses(unauthConfig));
		});

		it('getMyQuestionnaireResponse rejects unauthenticated', async () => {
			expectFailure(await getMyQuestionnaireResponse(unauthConfig, 'questionnaire-1'));
		});

		it('submitQuestionnaireResponse rejects unauthenticated', async () => {
			expectFailure(
				await submitQuestionnaireResponse(unauthConfig, 'questionnaire-1', [
					{
						questionIndex: 0,
						answer: { type: 'short_answer', response: 'A' }
					}
				])
			);
		});

		it('updateMyQuestionnaireResponse rejects unauthenticated', async () => {
			expectFailure(
				await updateMyQuestionnaireResponse(unauthConfig, 'questionnaire-1', [
					{
						questionIndex: 0,
						answer: { type: 'short_answer', response: 'B' }
					}
				])
			);
		});
	});

	describe('submissions', () => {
		it('getMySubmission rejects unauthenticated', async () => {
			expectFailure(await getMySubmission(unauthConfig, 'assignment-1'));
		});

		it('startSubmission rejects unauthenticated', async () => {
			expectFailure(await startSubmission(unauthConfig, 'assignment-1'));
		});

		it('submitAssignment rejects unauthenticated', async () => {
			expectFailure(await submitAssignment(unauthConfig, 'assignment-1'));
		});
	});

	describe('users', () => {
		it('getMyProfile rejects unauthenticated', async () => {
			expectFailure(await getMyProfile(unauthConfig));
		});

		it('updateMyProfile rejects unauthenticated', async () => {
			expectFailure(await updateMyProfile(unauthConfig, { displayName: 'X' }));
		});
	});

	describe('wallets', () => {
		it('getWallet rejects unauthenticated', async () => {
			expectFailure(await getWallet(unauthConfig, 'wallet-1'));
		});

		it('getMyWallet rejects unauthenticated', async () => {
			expectFailure(await getMyWallet(unauthConfig));
		});

		it('listWalletEntries rejects unauthenticated', async () => {
			expectFailure(await listWalletEntries(unauthConfig, 'wallet-1'));
		});

		it('getCourseWallet rejects unauthenticated', async () => {
			expectFailure(await getCourseWallet(unauthConfig, 'course-1'));
		});
	});
});
