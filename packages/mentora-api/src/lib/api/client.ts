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
	Conversation,
	LedgerEntry,
	Submission,
	Topic,
	UserProfile,
	Wallet
} from 'mentora-firebase';
import * as AssignmentsModule from './assignments.js';
import * as BackendModule from './backend.js';
import * as CoursesModule from './courses.js';
import * as ConversationsModule from './conversations.js';
import * as StatisticsModule from './statistics.js';
import * as StreamingModule from './streaming.js';
import * as SubmissionsModule from './submissions.js';
import * as TopicsModule from './topics.js';
import type { APIResult, MentoraAPIConfig, QueryOptions } from './types.js';
import * as UsersModule from './users.js';
import * as WalletsModule from './wallets.js';

export type {
	Assignment,
	CourseDoc,
	CourseMembership,
	Conversation,
	LedgerEntry,
	Submission,
	Topic,
	Turn,
	UserProfile,
	Wallet
} from 'mentora-firebase';
export type { APIResult, MentoraAPIConfig, QueryOptions } from './types.js';

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
		get: (courseId: string): Promise<APIResult<CourseDoc>> =>
			this.authReadyThen(() => CoursesModule.getCourse(this._config, courseId)),
		listMine: (options?: QueryOptions): Promise<APIResult<CourseDoc[]>> =>
			this.authReadyThen(() => CoursesModule.listMyCourses(this._config, options)),
		listEnrolled: (options?: QueryOptions): Promise<APIResult<CourseDoc[]>> =>
			this.authReadyThen(() => CoursesModule.listMyEnrolledCourses(this._config, options)),
		create: (title: string, code: string): Promise<APIResult<string>> =>
			this.authReadyThen(() => CoursesModule.createCourse(this._config, title, code)),
		getRoster: (courseId: string, options?: QueryOptions): Promise<APIResult<CourseMembership[]>> =>
			this.authReadyThen(() => CoursesModule.getCourseRoster(this._config, courseId, options)),
		joinByCode: (code: string): Promise<APIResult<string>> =>
			this.authReadyThen(() => BackendModule.joinCourseByCode(this._config, code)),
		listPublic: (options?: QueryOptions): Promise<APIResult<CourseDoc[]>> =>
			CoursesModule.listPublicCourses(this._config, options),
		listAllEnrolled: (options?: QueryOptions): Promise<APIResult<CourseDoc[]>> =>
			this.authReadyThen(() => CoursesModule.listAllEnrolledCourses(this._config, options)),
		update: (
			courseId: string,
			updates: Partial<Omit<CourseDoc, 'id' | 'ownerId' | 'createdAt'>>
		): Promise<APIResult<CourseDoc>> =>
			this.authReadyThen(() => CoursesModule.updateCourse(this._config, courseId, updates)),
		delete: (courseId: string): Promise<APIResult<void>> =>
			this.authReadyThen(() => CoursesModule.deleteCourse(this._config, courseId))
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
		): Promise<APIResult<void>> =>
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
			this.authReadyThen(() => AssignmentsModule.deleteAssignment(this._config, assignmentId))
	};

	// ============ Submissions ============
	submissions = {
		get: (assignmentId: string, userId: string): Promise<APIResult<Submission>> =>
			this.authReadyThen(() => SubmissionsModule.getSubmission(this._config, assignmentId, userId)),
		getMine: (assignmentId: string): Promise<APIResult<Submission>> =>
			this.authReadyThen(() => SubmissionsModule.getMySubmission(this._config, assignmentId)),
		listForAssignment: (
			assignmentId: string,
			options?: QueryOptions
		): Promise<APIResult<Submission[]>> =>
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
		): Promise<APIResult<Submission>> =>
			this.authReadyThen(() =>
				SubmissionsModule.gradeSubmission(this._config, assignmentId, userId, updates)
			)
	};

	// ============ Conversations ============
	conversations = {
		get: (conversationId: string): Promise<APIResult<Conversation>> =>
			this.authReadyThen(() => ConversationsModule.getConversation(this._config, conversationId)),
		getForAssignment: (assignmentId: string, userId?: string): Promise<APIResult<Conversation>> =>
			this.authReadyThen(() =>
				ConversationsModule.getAssignmentConversation(this._config, assignmentId, userId)
			)
	};

	// ============ Streaming ============
	streaming = {
		createClient: (
			conversationId: string,
			handlers?: StreamingModule.StreamingEventHandlers
		): StreamingModule.StreamingClient =>
			StreamingModule.createStreamingClient(this._config, conversationId, handlers),
		getSession: (
			sessionId: string
		): Promise<APIResult<import('mentora-firebase').StreamingSession>> =>
			this.authReadyThen(() => StreamingModule.getStreamingSession(this._config, sessionId))
	};

	// ============ Statistics ============
	statistics = {
		getForAssignment: (
			assignmentId: string
		): Promise<APIResult<StatisticsModule.AssignmentStatistics>> =>
			this.authReadyThen(() =>
				StatisticsModule.getAssignmentStatistics(this._config, assignmentId)
			),
		getForCourse: (courseId: string): Promise<APIResult<StatisticsModule.CourseStatistics>> =>
			this.authReadyThen(() => StatisticsModule.getCourseStatistics(this._config, courseId)),
		getStudentProgress: (
			courseId: string
		): Promise<APIResult<StatisticsModule.StudentProgress[]>> =>
			this.authReadyThen(() => StatisticsModule.getCourseStudentProgress(this._config, courseId)),
		exportAssignment: (assignmentId: string): Promise<APIResult<Blob>> =>
			this.authReadyThen(() =>
				StatisticsModule.exportAssignmentStatistics(this._config, assignmentId)
			),
		getConversationAnalytics: (
			conversationId: string
		): Promise<
			APIResult<{
				conversation: Conversation;
				analytics: {
					totalTurns: number;
					userTurns: number;
					aiTurns: number;
					averageResponseLength: number;
					stanceProgression: Array<{ turnId: string; stance: string | null }>;
					strategiesUsed: string[];
					duration: number;
				};
			}>
		> =>
			this.authReadyThen(() =>
				StatisticsModule.getConversationAnalytics(this._config, conversationId)
			),
		getCompletionStatus: (
			assignmentId: string
		): Promise<APIResult<StatisticsModule.CompletionStatus>> =>
			this.authReadyThen(() =>
				StatisticsModule.getAssignmentCompletionStatus(this._config, assignmentId)
			)
	};

	// ============ Wallets ============
	wallets = {
		get: (walletId: string): Promise<APIResult<Wallet>> =>
			this.authReadyThen(() => WalletsModule.getWallet(this._config, walletId)),
		getMine: (): Promise<APIResult<Wallet | null>> =>
			this.authReadyThen(() => WalletsModule.getMyWallet(this._config)),
		listEntries: (walletId: string, options?: QueryOptions): Promise<APIResult<LedgerEntry[]>> =>
			this.authReadyThen(() => WalletsModule.listWalletEntries(this._config, walletId, options))
	};

	// ============ Backend ============
	backend = {
		call: <T>(endpoint: string, options?: RequestInit): Promise<APIResult<T>> =>
			this.authReadyThen(() => BackendModule.callBackend<T>(this._config, endpoint, options))
	};
}
