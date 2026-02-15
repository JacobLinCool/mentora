/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as AssignmentsModule from '../src/lib/api/assignments.js';
import * as AnnouncementsModule from '../src/lib/api/announcements.js';
import * as BackendModule from '../src/lib/api/backend.js';
import { MentoraClient } from '../src/lib/api/client.js';
import * as ConversationsModule from '../src/lib/api/conversations.js';
import * as CoursesModule from '../src/lib/api/courses.js';
import * as QuestionnaireResponsesModule from '../src/lib/api/questionnaireResponses.js';
import * as QuestionnairesModule from '../src/lib/api/questionnaires.js';
import * as SubmissionsModule from '../src/lib/api/submissions.js';
import * as TopicsModule from '../src/lib/api/topics.js';
import type { MentoraAPIConfig } from '../src/lib/api/types.js';
import * as UsersModule from '../src/lib/api/users.js';
import * as WalletsModule from '../src/lib/api/wallets.js';

function createClient(): MentoraClient {
	const mockUser = {
		uid: 'matrix-user',
		getIdToken: vi.fn().mockResolvedValue('token-matrix')
	};
	const auth = {
		onAuthStateChanged: (callback: (user: unknown) => void) => {
			callback(mockUser);
			return () => {};
		},
		authStateReady: () => Promise.resolve()
	} as unknown as MentoraAPIConfig['auth'];

	return new MentoraClient({
		auth,
		db: {} as MentoraAPIConfig['db'],
		backendBaseUrl: 'http://api.test',
		environment: { browser: false }
	});
}

describe('MentoraClient method matrix', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('invokes every public namespace method at least once', async () => {
		const usersSpies = {
			getMyProfile: vi
				.spyOn(UsersModule, 'getMyProfile')
				.mockResolvedValue({ success: true, data: {} as any }),
			getUserProfile: vi
				.spyOn(UsersModule, 'getUserProfile')
				.mockResolvedValue({ success: true, data: {} as any }),
			updateMyProfile: vi
				.spyOn(UsersModule, 'updateMyProfile')
				.mockResolvedValue({ success: true, data: undefined })
		};

		const coursesSpies = {
			getCourse: vi
				.spyOn(CoursesModule, 'getCourse')
				.mockResolvedValue({ success: true, data: {} as any }),
			listMyCourses: vi
				.spyOn(CoursesModule, 'listMyCourses')
				.mockResolvedValue({ success: true, data: [] }),
			listMyEnrolledCourses: vi
				.spyOn(CoursesModule, 'listMyEnrolledCourses')
				.mockResolvedValue({ success: true, data: [] }),
			createCourse: vi
				.spyOn(CoursesModule, 'createCourse')
				.mockResolvedValue({ success: true, data: 'course-1' }),
			getCourseRoster: vi
				.spyOn(CoursesModule, 'getCourseRoster')
				.mockResolvedValue({ success: true, data: [] }),
			inviteMember: vi
				.spyOn(CoursesModule, 'inviteMember')
				.mockResolvedValue({ success: true, data: 'member-1' }),
			joinByCode: vi.spyOn(CoursesModule, 'joinByCode').mockResolvedValue({
				success: true,
				data: { courseId: 'course-1', joined: true }
			}),
			listPublicCourses: vi
				.spyOn(CoursesModule, 'listPublicCourses')
				.mockResolvedValue({ success: true, data: [] }),
			listAllEnrolledCourses: vi
				.spyOn(CoursesModule, 'listAllEnrolledCourses')
				.mockResolvedValue({ success: true, data: [] }),
			updateCourse: vi
				.spyOn(CoursesModule, 'updateCourse')
				.mockResolvedValue({ success: true, data: {} as any }),
			deleteCourse: vi
				.spyOn(CoursesModule, 'deleteCourse')
				.mockResolvedValue({ success: true, data: undefined }),
			updateMember: vi
				.spyOn(CoursesModule, 'updateMember')
				.mockResolvedValue({ success: true, data: {} as any }),
			removeMember: vi
				.spyOn(CoursesModule, 'removeMember')
				.mockResolvedValue({ success: true, data: undefined }),
			copyCourse: vi
				.spyOn(CoursesModule, 'copyCourse')
				.mockResolvedValue({ success: true, data: 'course-copy-1' }),
			createAnnouncement: vi
				.spyOn(CoursesModule, 'createAnnouncement')
				.mockResolvedValue({ success: true, data: {} as any })
		};

		const announcementsSpies = {
			getMyAnnouncement: vi
				.spyOn(AnnouncementsModule, 'getMyAnnouncement')
				.mockResolvedValue({ success: true, data: {} as any }),
			listMyAnnouncements: vi
				.spyOn(AnnouncementsModule, 'listMyAnnouncements')
				.mockResolvedValue({ success: true, data: [] }),
			markAnnouncementRead: vi
				.spyOn(AnnouncementsModule, 'markAnnouncementRead')
				.mockResolvedValue({ success: true, data: { updated: true } }),
			markAllAnnouncementsRead: vi
				.spyOn(AnnouncementsModule, 'markAllAnnouncementsRead')
				.mockResolvedValue({ success: true, data: { updatedCount: 1 } })
		};

		const topicsSpies = {
			getTopic: vi
				.spyOn(TopicsModule, 'getTopic')
				.mockResolvedValue({ success: true, data: {} as any }),
			listCourseTopics: vi
				.spyOn(TopicsModule, 'listCourseTopics')
				.mockResolvedValue({ success: true, data: [] }),
			createTopic: vi
				.spyOn(TopicsModule, 'createTopic')
				.mockResolvedValue({ success: true, data: 'topic-1' }),
			updateTopic: vi
				.spyOn(TopicsModule, 'updateTopic')
				.mockResolvedValue({ success: true, data: {} as any }),
			deleteTopic: vi
				.spyOn(TopicsModule, 'deleteTopic')
				.mockResolvedValue({ success: true, data: undefined })
		};

		const assignmentsSpies = {
			getAssignment: vi
				.spyOn(AssignmentsModule, 'getAssignment')
				.mockResolvedValue({ success: true, data: {} as any }),
			listCourseAssignments: vi
				.spyOn(AssignmentsModule, 'listCourseAssignments')
				.mockResolvedValue({ success: true, data: [] }),
			listAvailableAssignments: vi
				.spyOn(AssignmentsModule, 'listAvailableAssignments')
				.mockResolvedValue({ success: true, data: [] }),
			createAssignment: vi
				.spyOn(AssignmentsModule, 'createAssignment')
				.mockResolvedValue({ success: true, data: 'assignment-1' }),
			updateAssignment: vi
				.spyOn(AssignmentsModule, 'updateAssignment')
				.mockResolvedValue({ success: true, data: {} as any }),
			deleteAssignment: vi
				.spyOn(AssignmentsModule, 'deleteAssignment')
				.mockResolvedValue({ success: true, data: undefined }),
			generateContent: vi.spyOn(AssignmentsModule, 'generateContent').mockResolvedValue({
				success: true,
				data: { content: 'generated', tokenUsage: { byFeature: {}, totals: {} as any } }
			})
		};

		const questionnairesSpies = {
			getQuestionnaire: vi
				.spyOn(QuestionnairesModule, 'getQuestionnaire')
				.mockResolvedValue({ success: true, data: {} as any }),
			listCourseQuestionnaires: vi
				.spyOn(QuestionnairesModule, 'listCourseQuestionnaires')
				.mockResolvedValue({ success: true, data: [] }),
			listAvailableQuestionnaires: vi
				.spyOn(QuestionnairesModule, 'listAvailableQuestionnaires')
				.mockResolvedValue({ success: true, data: [] }),
			createQuestionnaire: vi
				.spyOn(QuestionnairesModule, 'createQuestionnaire')
				.mockResolvedValue({ success: true, data: 'questionnaire-1' }),
			updateQuestionnaire: vi
				.spyOn(QuestionnairesModule, 'updateQuestionnaire')
				.mockResolvedValue({ success: true, data: {} as any }),
			deleteQuestionnaire: vi
				.spyOn(QuestionnairesModule, 'deleteQuestionnaire')
				.mockResolvedValue({ success: true, data: undefined })
		};

		const questionnaireResponsesSpies = {
			getQuestionnaireResponse: vi
				.spyOn(QuestionnaireResponsesModule, 'getQuestionnaireResponse')
				.mockResolvedValue({ success: true, data: {} as any }),
			listQuestionnaireResponses: vi
				.spyOn(QuestionnaireResponsesModule, 'listQuestionnaireResponses')
				.mockResolvedValue({ success: true, data: [] }),
			listMyQuestionnaireResponses: vi
				.spyOn(QuestionnaireResponsesModule, 'listMyQuestionnaireResponses')
				.mockResolvedValue({ success: true, data: [] }),
			getMyQuestionnaireResponse: vi
				.spyOn(QuestionnaireResponsesModule, 'getMyQuestionnaireResponse')
				.mockResolvedValue({ success: true, data: null }),
			submitQuestionnaireResponse: vi
				.spyOn(QuestionnaireResponsesModule, 'submitQuestionnaireResponse')
				.mockResolvedValue({ success: true, data: 'response-1' }),
			updateMyQuestionnaireResponse: vi
				.spyOn(QuestionnaireResponsesModule, 'updateMyQuestionnaireResponse')
				.mockResolvedValue({ success: true, data: {} as any }),
			deleteQuestionnaireResponse: vi
				.spyOn(QuestionnaireResponsesModule, 'deleteQuestionnaireResponse')
				.mockResolvedValue({ success: true, data: undefined })
		};

		const submissionsSpies = {
			getSubmission: vi
				.spyOn(SubmissionsModule, 'getSubmission')
				.mockResolvedValue({ success: true, data: {} as any }),
			getMySubmission: vi
				.spyOn(SubmissionsModule, 'getMySubmission')
				.mockResolvedValue({ success: true, data: {} as any }),
			listAssignmentSubmissions: vi
				.spyOn(SubmissionsModule, 'listAssignmentSubmissions')
				.mockResolvedValue({ success: true, data: [] }),
			startSubmission: vi
				.spyOn(SubmissionsModule, 'startSubmission')
				.mockResolvedValue({ success: true, data: undefined }),
			submitAssignment: vi
				.spyOn(SubmissionsModule, 'submitAssignment')
				.mockResolvedValue({ success: true, data: undefined }),
			gradeSubmission: vi
				.spyOn(SubmissionsModule, 'gradeSubmission')
				.mockResolvedValue({ success: true, data: {} as any })
		};

		const conversationsSpies = {
			getConversation: vi
				.spyOn(ConversationsModule, 'getConversation')
				.mockResolvedValue({ success: true, data: {} as any }),
			getAssignmentConversation: vi
				.spyOn(ConversationsModule, 'getAssignmentConversation')
				.mockResolvedValue({ success: true, data: {} as any }),
			listMyConversations: vi
				.spyOn(ConversationsModule, 'listMyConversations')
				.mockResolvedValue({ success: true, data: [] }),
			createConversation: vi.spyOn(ConversationsModule, 'createConversation').mockResolvedValue({
				success: true,
				data: { id: 'conversation-1', created: true, reopened: false }
			}),
			endConversation: vi
				.spyOn(ConversationsModule, 'endConversation')
				.mockResolvedValue({ success: true, data: undefined }),
			addTurn: vi.spyOn(ConversationsModule, 'addTurn').mockResolvedValue({
				success: true,
				data: {
					text: 'ok',
					audio: 'base64',
					audioMimeType: 'audio/mp3',
					tokenUsage: { byFeature: {}, totals: {} as any }
				}
			})
		};

		const walletsSpies = {
			getWallet: vi
				.spyOn(WalletsModule, 'getWallet')
				.mockResolvedValue({ success: true, data: {} as any }),
			getMyWallet: vi
				.spyOn(WalletsModule, 'getMyWallet')
				.mockResolvedValue({ success: true, data: null }),
			listWalletEntries: vi
				.spyOn(WalletsModule, 'listWalletEntries')
				.mockResolvedValue({ success: true, data: [] }),
			getCourseWallet: vi
				.spyOn(WalletsModule, 'getCourseWallet')
				.mockResolvedValue({ success: true, data: { wallet: {} as any } }),
			addCredits: vi.spyOn(WalletsModule, 'addCredits').mockResolvedValue({
				success: true,
				data: { id: 'entry-1', idempotent: false, newBalance: 100 }
			})
		};

		const backendSpy = vi.spyOn(BackendModule, 'callBackend').mockResolvedValue({
			success: true,
			data: {}
		});

		const client = createClient();
		await client.authReady;

		await client.users.getMyProfile();
		await client.users.getProfile('user-a');
		await client.users.updateMyProfile({ displayName: 'Matrix User' });

		await client.courses.get('course-a');
		await client.courses.listMine({ limit: 5 });
		await client.courses.listEnrolled({ limit: 5 });
		await client.courses.create('Course A', 'MATRIX1', { visibility: 'private' });
		await client.courses.getRoster('course-a', { limit: 5 });
		await client.courses.inviteMember('course-a', 'student@test.local', 'student');
		await client.courses.joinByCode('MATRIX1');
		await client.courses.listPublic({ limit: 5 });
		await client.courses.listAllEnrolled({ limit: 5 });
		await client.courses.update('course-a', { title: 'Course Updated' });
		await client.courses.delete('course-a');
		await client.courses.updateMember('course-a', 'member-a', { role: 'ta', status: 'active' });
		await client.courses.removeMember('course-a', 'member-a');
		await client.courses.getWallet('course-a', { includeLedger: true, ledgerLimit: 5 });
		await client.courses.copy('course-a', { includeContent: true, includeRoster: false });
		await client.courses.createAnnouncement('course-a', 'Announcement');
		await client.announcements.get('announcement-a');
		await client.announcements.listMine({ limit: 5 });
		await client.announcements.markRead('announcement-a');
		await client.announcements.markAllRead();

		await client.topics.get('topic-a');
		await client.topics.listForCourse('course-a', { limit: 5 });
		await client.topics.create({
			courseId: 'course-a',
			title: 'Topic A',
			description: null,
			order: 1,
			contents: [],
			contentTypes: []
		});
		await client.topics.update('topic-a', { title: 'Topic Updated' });
		await client.topics.delete('topic-a');

		await client.assignments.get('assignment-a');
		await client.assignments.listForCourse('course-a', { limit: 5 });
		await client.assignments.listAvailable('course-a', { limit: 5 });
		await client.assignments.create({
			courseId: 'course-a',
			topicId: null,
			title: 'Assignment A',
			question: 'Question',
			prompt: 'Prompt',
			mode: 'instant',
			startAt: Date.now(),
			dueAt: null,
			allowLate: true,
			allowResubmit: true
		});
		await client.assignments.update('assignment-a', { title: 'Assignment Updated' });
		await client.assignments.delete('assignment-a');
		await client.assignments.generateContent('What is critical thinking?');

		await client.questionnaires.get('questionnaire-a');
		await client.questionnaires.listForCourse('course-a', { limit: 5 });
		await client.questionnaires.listAvailable('course-a', { limit: 5 });
		await client.questionnaires.create({
			courseId: 'course-a',
			topicId: null,
			title: 'Questionnaire A',
			questions: [
				{
					question: {
						type: 'short_answer',
						questionText: 'How are you?'
					},
					required: true
				}
			],
			startAt: Date.now(),
			dueAt: null,
			allowLate: true,
			allowResubmit: true
		});
		await client.questionnaires.update('questionnaire-a', { title: 'Questionnaire Updated' });
		await client.questionnaires.delete('questionnaire-a');

		await client.questionnaireResponses.get('questionnaire-a', 'user-a');
		await client.questionnaireResponses.listForQuestionnaire('questionnaire-a', { limit: 5 });
		await client.questionnaireResponses.listMine({ limit: 5 });
		await client.questionnaireResponses.getMine('questionnaire-a');
		await client.questionnaireResponses.submit('questionnaire-a', [
			{
				questionIndex: 0,
				answer: { type: 'short_answer', response: 'A response' }
			}
		]);
		await client.questionnaireResponses.updateMine('questionnaire-a', [
			{
				questionIndex: 0,
				answer: { type: 'short_answer', response: 'Updated response' }
			}
		]);
		await client.questionnaireResponses.delete('questionnaire-a', 'user-a');

		await client.submissions.get('assignment-a', 'user-a');
		await client.submissions.getMine('assignment-a');
		await client.submissions.listForAssignment('assignment-a', { limit: 5 });
		await client.submissions.start('assignment-a');
		await client.submissions.submit('assignment-a');
		await client.submissions.grade('assignment-a', 'user-a', { scoreCompletion: 85 });

		await client.conversations.get('conversation-a');
		await client.conversations.getForAssignment('assignment-a');
		await client.conversations.listMine({ limit: 5 });
		await client.conversations.create('assignment-a');
		await client.conversations.end('conversation-a');
		await client.conversations.addTurn('conversation-a', 'raw-string', 'idea');
		await client.conversations.addTurn('conversation-a', { text: 'text-object' });
		await client.conversations.addTurn('conversation-a', {
			audioBase64: 'ZmFrZS1hdWRpbw==',
			audioMimeType: 'audio/mp3'
		});
		await client.conversations.addTurn('conversation-a', {
			audio: new Blob(['audio'], { type: 'audio/mp3' }),
			text: 'blob-input'
		});

		await client.wallets.get('wallet-a');
		await client.wallets.getMine();
		await client.wallets.listEntries('wallet-a', { limit: 5 });
		await client.wallets.addCredits({ amount: 50, idempotencyKey: 'wallet-key' });

		await client.backend.call('/health', { method: 'GET' });

		for (const spy of Object.values(usersSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(coursesSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(announcementsSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(topicsSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(assignmentsSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(questionnairesSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(questionnaireResponsesSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(submissionsSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(conversationsSpies)) expect(spy).toHaveBeenCalled();
		for (const spy of Object.values(walletsSpies)) expect(spy).toHaveBeenCalled();
		expect(backendSpy).toHaveBeenCalled();

		// Parameter validation for representative methods
		expect(coursesSpies.getCourse).toHaveBeenCalledWith(expect.any(Object), 'course-a');
		expect(coursesSpies.inviteMember).toHaveBeenCalledWith(
			expect.any(Object),
			'course-a',
			'student@test.local',
			'student'
		);
		expect(coursesSpies.updateMember).toHaveBeenCalledWith(
			expect.any(Object),
			'course-a',
			'member-a',
			{ role: 'ta', status: 'active' }
		);
		expect(coursesSpies.removeMember).toHaveBeenCalledWith(
			expect.any(Object),
			'course-a',
			'member-a'
		);
		expect(announcementsSpies.getMyAnnouncement).toHaveBeenCalledWith(
			expect.any(Object),
			'announcement-a'
		);
		expect(announcementsSpies.markAnnouncementRead).toHaveBeenCalledWith(
			expect.any(Object),
			'announcement-a'
		);
		expect(topicsSpies.getTopic).toHaveBeenCalledWith(expect.any(Object), 'topic-a');
		expect(assignmentsSpies.getAssignment).toHaveBeenCalledWith(expect.any(Object), 'assignment-a');
		expect(submissionsSpies.getSubmission).toHaveBeenCalledWith(
			expect.any(Object),
			'assignment-a',
			'user-a'
		);
		expect(submissionsSpies.gradeSubmission).toHaveBeenCalledWith(
			expect.any(Object),
			'assignment-a',
			'user-a',
			{ scoreCompletion: 85 }
		);
		expect(conversationsSpies.getConversation).toHaveBeenCalledWith(
			expect.any(Object),
			'conversation-a'
		);
		expect(walletsSpies.getWallet).toHaveBeenCalledWith(expect.any(Object), 'wallet-a');
	});
});
