/**
 * Base Mentora Client - Works in any JavaScript environment
 * No Svelte-specific dependencies
 */
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type {
	Assignment,
	CourseDoc,
	CourseMembership,
	Questionnaire,
	Submission,
	Topic,
	UserProfile
} from 'mentora-firebase';

import * as AssignmentsModule from './assignments.js';
import * as CoursesModule from './courses.js';
import * as ConversationsModule from './conversations.js';
import * as QuestionnairesModule from './questionnaires.js';
import * as QuestionnaireResponsesModule from './questionnaireResponses.js';
import * as SubmissionsModule from './submissions.js';
import * as TopicsModule from './topics.js';
import type { APIResult, MentoraAPIConfig, QueryOptions } from './types.js';
import * as UsersModule from './users.js';
import * as WalletsModule from './wallets.js';
import { callBackend } from './backend.js';

export type {
	Assignment,
	CourseDoc,
	CourseMembership,
	Questionnaire,
	QuestionnaireResponse,
	Submission,
	Topic,
	Turn,
	UserProfile
} from 'mentora-firebase';

export type Course = CoursesModule.Course;
export type Conversation = ConversationsModule.Conversation;
export type Wallet = WalletsModule.Wallet;
export type LedgerEntry = WalletsModule.LedgerEntry;
export type { APIResult, MentoraAPIConfig, QueryOptions } from './types.js';
export { APIErrorCode } from './types.js';
export type { WhereFilterOp } from 'firebase/firestore';

export type { SubmissionWithId } from './submissions.js';

/**
 * Configuration options for MentoraClient
 */
export interface MentoraClientConfig {
	auth: Auth;
	db: Firestore;
	backendBaseUrl: string;
	environment?: {
		browser: boolean;
	};
}

/**
 * Base Mentora client that works in any JavaScript environment.
 * For Svelte apps with reactivity, use MentoraAPI from 'mentora-api/svelte'.
 */
export class MentoraClient {
	protected _currentUser: User | null = null;
	protected _config: MentoraAPIConfig;
	protected _authReadyPromise: Promise<void>;
	protected _authReadyResolve!: () => void;

	constructor(config: MentoraClientConfig) {
		this._config = {
			auth: config.auth,
			db: config.db,
			backendBaseUrl: config.backendBaseUrl,
			environment: config.environment ?? { browser: false },
			getCurrentUser: () => this._currentUser
		};

		this._authReadyPromise = new Promise((resolve) => {
			this._authReadyResolve = resolve;
		});

		// Set up auth state listener
		this._config.auth.onAuthStateChanged((user) => {
			this._currentUser = user;
			this._authReadyResolve();
		});
	}

	/**
	 * Wait for auth state to be determined
	 */
	get authReady(): Promise<void> {
		return this._config.auth.authStateReady();
	}

	/**
	 * Current authenticated user
	 */
	get currentUser(): User | null {
		return this._currentUser;
	}

	/**
	 * Whether a user is currently authenticated
	 */
	get isAuthenticated(): boolean {
		return this._currentUser !== null;
	}

	/**
	 * Current user's UID
	 */
	get userId(): string | null {
		return this._currentUser?.uid ?? null;
	}

	/**
	 * Wait for auth to be ready, then execute
	 */
	protected async authReadyThen<T>(fn: () => Promise<T>): Promise<T> {
		await this.authReady;
		return fn();
	}

	// ============ Users ============
	users = {
		getMyProfile: (): Promise<APIResult<UserProfile>> =>
			this.authReadyThen(() => UsersModule.getMyProfile(this._config)),
		getProfile: (uid: string): Promise<APIResult<UserProfile>> =>
			this.authReadyThen(() => UsersModule.getUserProfile(this._config, uid)),
		updateMyProfile: (
			profile: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
		): Promise<APIResult<void>> =>
			this.authReadyThen(() => UsersModule.updateMyProfile(this._config, profile))
	};

	// ============ Courses ============
	courses = {
		get: (courseId: string): Promise<APIResult<CoursesModule.Course>> =>
			this.authReadyThen(() => CoursesModule.getCourse(this._config, courseId)),
		listMine: (options?: QueryOptions): Promise<APIResult<CoursesModule.Course[]>> =>
			this.authReadyThen(() => CoursesModule.listMyCourses(this._config, options)),
		listEnrolled: (options?: QueryOptions): Promise<APIResult<CoursesModule.Course[]>> =>
			this.authReadyThen(() => CoursesModule.listMyEnrolledCourses(this._config, options)),
		create: (
			title: string,
			code?: string,
			options?: CoursesModule.CreateCourseOptions
		): Promise<APIResult<string>> =>
			this.authReadyThen(() => CoursesModule.createCourse(this._config, title, code, options)),
		getRoster: (courseId: string, options?: QueryOptions): Promise<APIResult<CourseMembership[]>> =>
			this.authReadyThen(() => CoursesModule.getCourseRoster(this._config, courseId, options)),
		inviteMember: (
			courseId: string,
			email: string,
			role?: 'instructor' | 'student' | 'ta' | 'auditor'
		): Promise<APIResult<string>> =>
			this.authReadyThen(() => CoursesModule.inviteMember(this._config, courseId, email, role)),
		joinByCode: (code: string): Promise<APIResult<CoursesModule.JoinCourseResult>> =>
			this.authReadyThen(() => CoursesModule.joinByCode(this._config, code)),
		listPublic: (options?: QueryOptions): Promise<APIResult<CoursesModule.Course[]>> =>
			CoursesModule.listPublicCourses(this._config, options),
		listAllEnrolled: (options?: QueryOptions): Promise<APIResult<CoursesModule.Course[]>> =>
			this.authReadyThen(() => CoursesModule.listAllEnrolledCourses(this._config, options)),
		update: (
			courseId: string,
			updates: Partial<Omit<CourseDoc, 'id' | 'ownerId' | 'createdAt'>>
		): Promise<APIResult<CoursesModule.Course>> =>
			this.authReadyThen(() => CoursesModule.updateCourse(this._config, courseId, updates)),
		delete: (courseId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() => CoursesModule.deleteCourse(this._config, courseId)),
		updateMember: (
			courseId: string,
			memberId: string,
			updates: { role?: 'instructor' | 'student' | 'ta' | 'auditor'; status?: 'active' | 'removed' }
		): Promise<APIResult<CourseMembership>> =>
			this.authReadyThen(() =>
				CoursesModule.updateMember(this._config, courseId, memberId, updates)
			),
		removeMember: (courseId: string, memberId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() => CoursesModule.removeMember(this._config, courseId, memberId)),
		getWallet: (
			courseId: string,
			options?: { includeLedger?: boolean; ledgerLimit?: number }
		): Promise<APIResult<WalletsModule.CourseWalletResult>> =>
			this.authReadyThen(() => WalletsModule.getCourseWallet(this._config, courseId, options)),

		copy: (
			courseId: string,
			options: {
				title?: string;
				includeContent?: boolean;
				includeRoster?: boolean;
				isDemo?: boolean;
			}
		): Promise<APIResult<string>> =>
			this.authReadyThen(() => CoursesModule.copyCourse(this._config, courseId, options)),
		createAnnouncement: (
			courseId: string,
			content: string
		): Promise<APIResult<import('mentora-firebase').CourseAnnouncement>> =>
			this.authReadyThen(() => CoursesModule.createAnnouncement(this._config, courseId, content))
	};

	// ============ Topics ============
	topics = {
		get: (topicId: string): Promise<APIResult<Topic>> =>
			this.authReadyThen(() => TopicsModule.getTopic(this._config, topicId)),
		listForCourse: (courseId: string, options?: QueryOptions): Promise<APIResult<Topic[]>> =>
			this.authReadyThen(() => TopicsModule.listCourseTopics(this._config, courseId, options)),
		create: (
			topic: Omit<Topic, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
		): Promise<APIResult<string>> =>
			this.authReadyThen(() => TopicsModule.createTopic(this._config, topic)),
		update: (
			topicId: string,
			updates: Partial<Omit<Topic, 'id' | 'courseId' | 'createdBy' | 'createdAt'>>
		): Promise<APIResult<Topic>> =>
			this.authReadyThen(() => TopicsModule.updateTopic(this._config, topicId, updates)),
		delete: (topicId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() => TopicsModule.deleteTopic(this._config, topicId))
	};

	// ============ Assignments ============
	assignments = {
		get: (assignmentId: string): Promise<APIResult<Assignment>> =>
			this.authReadyThen(() => AssignmentsModule.getAssignment(this._config, assignmentId)),
		listForCourse: (courseId: string, options?: QueryOptions): Promise<APIResult<Assignment[]>> =>
			this.authReadyThen(() =>
				AssignmentsModule.listCourseAssignments(this._config, courseId, options)
			),
		listAvailable: (courseId: string, options?: QueryOptions): Promise<APIResult<Assignment[]>> =>
			this.authReadyThen(() =>
				AssignmentsModule.listAvailableAssignments(this._config, courseId, options)
			),
		create: (
			assignment: Omit<Assignment, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
		): Promise<APIResult<string>> =>
			this.authReadyThen(() => AssignmentsModule.createAssignment(this._config, assignment)),
		update: (
			assignmentId: string,
			updates: Partial<Omit<Assignment, 'id' | 'createdBy' | 'createdAt'>>
		): Promise<APIResult<Assignment>> =>
			this.authReadyThen(() =>
				AssignmentsModule.updateAssignment(this._config, assignmentId, updates)
			),
		delete: (assignmentId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() => AssignmentsModule.deleteAssignment(this._config, assignmentId)),
		generateContent: (question: string): Promise<APIResult<{ content: string }>> =>
			this.authReadyThen(() => AssignmentsModule.generateContent(this._config, question))
	};

	// ============ Questionnaires ============
	questionnaires = {
		get: (questionnaireId: string): Promise<APIResult<Questionnaire>> =>
			this.authReadyThen(() =>
				QuestionnairesModule.getQuestionnaire(this._config, questionnaireId)
			),
		listForCourse: (
			courseId: string,
			options?: QueryOptions
		): Promise<APIResult<Questionnaire[]>> =>
			this.authReadyThen(() =>
				QuestionnairesModule.listCourseQuestionnaires(this._config, courseId, options)
			),
		listAvailable: (
			courseId: string,
			options?: QueryOptions
		): Promise<APIResult<Questionnaire[]>> =>
			this.authReadyThen(() =>
				QuestionnairesModule.listAvailableQuestionnaires(this._config, courseId, options)
			),
		create: (
			questionnaire: Omit<Questionnaire, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
		): Promise<APIResult<string>> =>
			this.authReadyThen(() =>
				QuestionnairesModule.createQuestionnaire(this._config, questionnaire)
			),
		update: (
			questionnaireId: string,
			updates: Partial<Omit<Questionnaire, 'id' | 'createdBy' | 'createdAt'>>
		): Promise<APIResult<Questionnaire>> =>
			this.authReadyThen(() =>
				QuestionnairesModule.updateQuestionnaire(this._config, questionnaireId, updates)
			),
		delete: (questionnaireId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() =>
				QuestionnairesModule.deleteQuestionnaire(this._config, questionnaireId)
			)
	};

	// ============ Questionnaire Responses ============
	questionnaireResponses = {
		get: (
			questionnaireId: string,
			userId: string
		): Promise<APIResult<import('mentora-firebase').QuestionnaireResponse>> =>
			this.authReadyThen(() =>
				QuestionnaireResponsesModule.getQuestionnaireResponse(this._config, questionnaireId, userId)
			),
		listForQuestionnaire: (
			questionnaireId: string,
			options?: QueryOptions
		): Promise<APIResult<import('mentora-firebase').QuestionnaireResponse[]>> =>
			this.authReadyThen(() =>
				QuestionnaireResponsesModule.listQuestionnaireResponses(
					this._config,
					questionnaireId,
					options
				)
			),
		listMine: (
			options?: QueryOptions
		): Promise<APIResult<import('mentora-firebase').QuestionnaireResponse[]>> =>
			this.authReadyThen(() =>
				QuestionnaireResponsesModule.listMyQuestionnaireResponses(this._config, options)
			),
		getMine: (
			questionnaireId: string
		): Promise<APIResult<import('mentora-firebase').QuestionnaireResponse | null>> =>
			this.authReadyThen(() =>
				QuestionnaireResponsesModule.getMyQuestionnaireResponse(this._config, questionnaireId)
			),
		submit: (
			questionnaireId: string,
			responses: import('mentora-firebase').QuestionnaireResponse['responses'],
			courseId?: string | null
		): Promise<APIResult<string>> =>
			this.authReadyThen(() =>
				QuestionnaireResponsesModule.submitQuestionnaireResponse(
					this._config,
					questionnaireId,
					responses,
					courseId
				)
			),
		updateMine: (
			questionnaireId: string,
			responses: import('mentora-firebase').QuestionnaireResponse['responses']
		): Promise<APIResult<import('mentora-firebase').QuestionnaireResponse>> =>
			this.authReadyThen(() =>
				QuestionnaireResponsesModule.updateMyQuestionnaireResponse(
					this._config,
					questionnaireId,
					responses
				)
			),
		delete: (questionnaireId: string, userId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() =>
				QuestionnaireResponsesModule.deleteQuestionnaireResponse(
					this._config,
					questionnaireId,
					userId
				)
			)
	};

	// ============ Submissions ============
	submissions = {
		get: (
			assignmentId: string,
			userId: string
		): Promise<APIResult<SubmissionsModule.SubmissionWithId>> =>
			this.authReadyThen(() => SubmissionsModule.getSubmission(this._config, assignmentId, userId)),
		getMine: (assignmentId: string): Promise<APIResult<SubmissionsModule.SubmissionWithId>> =>
			this.authReadyThen(() => SubmissionsModule.getMySubmission(this._config, assignmentId)),
		listForAssignment: (
			assignmentId: string,
			options?: QueryOptions
		): Promise<APIResult<SubmissionsModule.SubmissionWithId[]>> =>
			this.authReadyThen(() =>
				SubmissionsModule.listAssignmentSubmissions(this._config, assignmentId, options)
			),
		start: (assignmentId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() => SubmissionsModule.startSubmission(this._config, assignmentId)),
		submit: (assignmentId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() => SubmissionsModule.submitAssignment(this._config, assignmentId)),
		grade: (
			assignmentId: string,
			userId: string,
			updates: Partial<Pick<Submission, 'scoreCompletion' | 'notes' | 'state'>>
		): Promise<APIResult<SubmissionsModule.SubmissionWithId>> =>
			this.authReadyThen(() =>
				SubmissionsModule.gradeSubmission(this._config, assignmentId, userId, updates)
			)
	};

	// ============ Conversations ============
	conversations = {
		get: (conversationId: string): Promise<APIResult<ConversationsModule.Conversation>> =>
			this.authReadyThen(() => ConversationsModule.getConversation(this._config, conversationId)),
		getForAssignment: (
			assignmentId: string,
			userId?: string
		): Promise<APIResult<ConversationsModule.Conversation>> =>
			this.authReadyThen(() =>
				ConversationsModule.getAssignmentConversation(this._config, assignmentId, userId)
			),
		listMine: (options?: QueryOptions): Promise<APIResult<ConversationsModule.Conversation[]>> =>
			this.authReadyThen(() => ConversationsModule.listMyConversations(this._config, options)),
		create: (assignmentId: string): Promise<APIResult<{ id: string }>> =>
			this.authReadyThen(() => ConversationsModule.createConversation(this._config, assignmentId)),
		end: (conversationId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() => ConversationsModule.endConversation(this._config, conversationId)),
		addTurn: (
			conversationId: string,
			text: string,
			type: 'idea' | 'followup'
		): Promise<APIResult<void>> =>
			this.authReadyThen(() =>
				ConversationsModule.addTurn(this._config, conversationId, text, type)
			)
	};

	// ============ Wallets ============
	wallets = {
		get: (walletId: string): Promise<APIResult<WalletsModule.Wallet>> =>
			this.authReadyThen(() => WalletsModule.getWallet(this._config, walletId)),
		getMine: (): Promise<APIResult<WalletsModule.Wallet | null>> =>
			this.authReadyThen(() => WalletsModule.getMyWallet(this._config)),
		listEntries: (
			walletId: string,
			options?: QueryOptions
		): Promise<APIResult<WalletsModule.LedgerEntry[]>> =>
			this.authReadyThen(() => WalletsModule.listWalletEntries(this._config, walletId, options)),
		addCredits: (amount: number, currency?: string): Promise<APIResult<{ id: string }>> =>
			this.authReadyThen(() => WalletsModule.addCredits(this._config, amount, currency))
	};

	// ============ Backend ============
	backend = {
		call: <T>(endpoint: string, options: RequestInit = {}): Promise<APIResult<T>> =>
			this.authReadyThen(() => callBackend<T>(this._config, endpoint, options))
	};
}
