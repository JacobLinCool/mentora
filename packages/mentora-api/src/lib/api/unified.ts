/**
 * Unified API Access Layer
 *
 * This module provides a single entry point for all data operations with a hybrid architecture:
 *
 * ## Architecture Overview
 *
 * ### Direct Access (Firestore SDK)
 * Simple CRUD operations executed directly via Firestore SDK:
 * - User profiles: read, update
 * - Courses: full CRUD, roster management
 * - Topics: full CRUD
 * - Assignments: full CRUD
 * - Submissions: read, basic updates
 * - Conversations: read, list
 * - Wallets: read-only
 *
 * Benefits:
 * - Lower latency (no server roundtrip)
 * - Real-time capabilities via onSnapshot
 * - Security enforced by Firestore Rules
 *
 * ### Delegated Access (Backend API)
 * Operations requiring server-side processing:
 * - LLM interactions: message, streaming, analysis
 * - Voice: transcription, synthesis
 * - Complex validation: join course by code
 * - Conversation management: create, end (requires validation)
 *
 * IMPORTANT: Backend only processes/computes data.
 * Data mutations are done client-side via Firestore to ensure security rules apply.
 *
 * @module UnifiedAPI
 */

import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type {
	Assignment,
	Conversation,
	CourseDoc,
	CourseMembership,
	Submission,
	Topic,
	UserProfile,
	Wallet,
	ConversationSummary
} from 'mentora-firebase';

import type { APIResult, QueryOptions } from './types.js';
import type { Unsubscribe } from './access/types.js';

// Re-export types
export type {
	Assignment,
	Conversation,
	CourseDoc,
	CourseMembership,
	Submission,
	Topic,
	UserProfile,
	Wallet
} from 'mentora-firebase';

/**
 * Access layer identifier - for debugging/logging
 */
export type AccessLayer = 'direct' | 'delegated';

/**
 * Configuration for the unified API
 */
export interface UnifiedAPIConfig {
	auth: Auth;
	db: Firestore;
	backendBaseUrl: string;
}

/**
 * Real-time subscription handlers
 */
export interface SubscriptionHandlers<T> {
	onData: (data: T) => void;
	onError?: (error: Error) => void;
	onLoading?: (loading: boolean) => void;
}

/**
 * LLM response structure
 */
export interface LLMResponse {
	turnId: string;
	text: string;
	analysis?: {
		stance?: string;
		quality?: number;
		suggestions?: string[];
	};
	tokenUsage?: {
		input: number;
		output: number;
	};
}

/**
 * Streaming event handlers
 */
export interface StreamingHandlers {
	onStart?: (data: { turnId: string }) => void;
	onChunk?: (data: { text: string }) => void;
	onComplete?: (data: LLMResponse) => void;
	onError?: (error: { code: string; message: string }) => void;
}

/**
 * Conversation analysis result
 */
export interface ConversationAnalysis {
	overallScore: number;
	stanceProgression: Array<{ turnId: string; stance: string }>;
	qualityMetrics: {
		argumentClarity: number;
		evidenceUsage: number;
		criticalThinking: number;
		responseToCounterpoints: number;
	};
	suggestions: string[];
	summary: string;
}

/**
 * Transcription result
 */
export interface TranscriptionResult {
	text: string;
	confidence: number;
	duration: number;
}

/**
 * Unified API - Direct Access Methods
 *
 * All direct access methods operate via Firestore SDK.
 * Security is enforced by Firestore Security Rules.
 */
export interface DirectAccessAPI {
	// User Profiles
	users: {
		/** Get current user's profile */
		getMyProfile(): Promise<APIResult<UserProfile>>;
		/** Get a user profile by UID */
		getProfile(uid: string): Promise<APIResult<UserProfile>>;
		/** Update current user's profile */
		updateMyProfile(
			updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
		): Promise<APIResult<void>>;
		/** Subscribe to current user's profile changes */
		subscribeToMyProfile(handlers: SubscriptionHandlers<UserProfile>): Unsubscribe;
	};

	// Courses
	courses: {
		/** Get a course by ID */
		get(courseId: string): Promise<APIResult<CourseDoc>>;
		/** List courses owned by current user */
		listMine(options?: QueryOptions): Promise<APIResult<CourseDoc[]>>;
		/** List courses where current user is enrolled as student */
		listEnrolled(options?: QueryOptions): Promise<APIResult<CourseDoc[]>>;
		/** List all courses where user is a member (any role) */
		listAllEnrolled(options?: QueryOptions): Promise<APIResult<CourseDoc[]>>;
		/** List public courses */
		listPublic(options?: QueryOptions): Promise<APIResult<CourseDoc[]>>;
		/** Create a new course */
		create(title: string, code?: string): Promise<APIResult<string>>;
		/** Update a course */
		update(
			courseId: string,
			updates: Partial<Omit<CourseDoc, 'id' | 'ownerId' | 'createdAt'>>
		): Promise<APIResult<CourseDoc>>;
		/** Delete a course */
		delete(courseId: string): Promise<APIResult<void>>;
		/** Get course roster */
		getRoster(courseId: string, options?: QueryOptions): Promise<APIResult<CourseMembership[]>>;
		/** Subscribe to course changes */
		subscribeToCourse(courseId: string, handlers: SubscriptionHandlers<CourseDoc>): Unsubscribe;
		/** Subscribe to courses owned by current user */
		subscribeToMyCourses(
			handlers: SubscriptionHandlers<CourseDoc[]>,
			options?: QueryOptions
		): Unsubscribe;
	};

	// Topics
	topics: {
		/** Get a topic by ID */
		get(topicId: string): Promise<APIResult<Topic>>;
		/** List topics for a course */
		listForCourse(courseId: string, options?: QueryOptions): Promise<APIResult<Topic[]>>;
		/** Create a topic */
		create(
			topic: Omit<Topic, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
		): Promise<APIResult<string>>;
		/** Update a topic */
		update(
			topicId: string,
			updates: Partial<Omit<Topic, 'id' | 'courseId' | 'createdBy' | 'createdAt'>>
		): Promise<APIResult<void>>;
		/** Delete a topic */
		delete(topicId: string): Promise<APIResult<void>>;
		/** Subscribe to topic changes */
		subscribeToTopic(topicId: string, handlers: SubscriptionHandlers<Topic>): Unsubscribe;
		/** Subscribe to course topics */
		subscribeToCourseTopics(
			courseId: string,
			handlers: SubscriptionHandlers<Topic[]>,
			options?: QueryOptions
		): Unsubscribe;
	};

	// Assignments
	assignments: {
		/** Get an assignment by ID */
		get(assignmentId: string): Promise<APIResult<Assignment>>;
		/** List all assignments for a course (instructor view) */
		listForCourse(courseId: string, options?: QueryOptions): Promise<APIResult<Assignment[]>>;
		/** List available assignments for a course (student view - respects startAt) */
		listAvailable(courseId: string, options?: QueryOptions): Promise<APIResult<Assignment[]>>;
		/** Create an assignment */
		create(
			assignment: Omit<Assignment, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
		): Promise<APIResult<string>>;
		/** Update an assignment */
		update(
			assignmentId: string,
			updates: Partial<Omit<Assignment, 'id' | 'createdBy' | 'createdAt'>>
		): Promise<APIResult<Assignment>>;
		/** Delete an assignment */
		delete(assignmentId: string): Promise<APIResult<void>>;
		/** Subscribe to assignment changes */
		subscribeToAssignment(
			assignmentId: string,
			handlers: SubscriptionHandlers<Assignment>
		): Unsubscribe;
		/** Subscribe to course assignments */
		subscribeToCourseAssignments(
			courseId: string,
			handlers: SubscriptionHandlers<Assignment[]>,
			options?: QueryOptions
		): Unsubscribe;
	};

	// Submissions
	submissions: {
		/** Get a specific submission */
		get(assignmentId: string, userId: string): Promise<APIResult<Submission>>;
		/** Get current user's submission */
		getMine(assignmentId: string): Promise<APIResult<Submission>>;
		/** List all submissions for an assignment (instructor view) */
		listForAssignment(
			assignmentId: string,
			options?: QueryOptions
		): Promise<APIResult<Submission[]>>;
		/** Start a submission (creates if not exists) */
		start(assignmentId: string): Promise<APIResult<void>>;
		/** Submit the assignment */
		submit(assignmentId: string): Promise<APIResult<void>>;
		/** Grade a submission (instructor only) */
		grade(
			assignmentId: string,
			userId: string,
			updates: Partial<Pick<Submission, 'scoreCompletion' | 'notes' | 'state'>>
		): Promise<APIResult<Submission>>;
		/** Subscribe to current user's submission */
		subscribeToMySubmission(
			assignmentId: string,
			handlers: SubscriptionHandlers<Submission>
		): Unsubscribe;
	};

	// Conversations (Read-only via direct access)
	conversations: {
		/** Get a conversation by ID */
		get(conversationId: string): Promise<APIResult<Conversation>>;
		/** Get conversation for an assignment (optionally by userId for instructors) */
		getForAssignment(assignmentId: string, userId?: string): Promise<APIResult<Conversation>>;
		/** Subscribe to conversation changes */
		subscribeToConversation(
			conversationId: string,
			handlers: SubscriptionHandlers<Conversation>
		): Unsubscribe;
	};

	// Wallets (Read-only)
	wallets: {
		/** Get a wallet by ID */
		get(walletId: string): Promise<APIResult<Wallet>>;
		/** Get current user's wallet */
		getMine(): Promise<APIResult<Wallet | null>>;
		/** Subscribe to current user's wallet */
		subscribeToMyWallet(handlers: SubscriptionHandlers<Wallet>): Unsubscribe;
	};
}

/**
 * Unified API - Delegated Access Methods
 *
 * These operations require server-side processing.
 * Backend handles logic but does NOT write to Firestore.
 * Results are returned to client which stores them.
 */
export interface DelegatedAccessAPI {
	// Course operations requiring validation
	courses: {
		/**
		 * Join a course by code (requires backend validation)
		 *
		 * Reasons for delegation:
		 * - Validate course exists and is joinable
		 * - Check enrollment limits
		 * - Handle password-protected courses
		 */
		joinByCode(
			code: string,
			password?: string
		): Promise<
			APIResult<{
				courseId: string;
				joined: boolean;
				alreadyMember?: boolean;
			}>
		>;
	};

	// Conversation management requiring validation
	conversations: {
		/**
		 * Create a conversation for an assignment
		 *
		 * Reasons for delegation:
		 * - Verify assignment exists and has started
		 * - Check user enrollment in course
		 * - Prevent duplicate conversations (unless resubmit allowed)
		 */
		create(assignmentId: string): Promise<
			APIResult<{
				id: string;
				state: string;
				isExisting?: boolean;
			}>
		>;

		/**
		 * End a conversation
		 *
		 * Reasons for delegation:
		 * - Trigger summary generation
		 * - Update submission state
		 * - Finalize scoring
		 */
		end(conversationId: string): Promise<
			APIResult<{
				state: string;
				summary?: ConversationSummary;
			}>
		>;
	};

	// LLM operations (requires API keys & processing)
	llm: {
		/**
		 * Submit a message and get AI response
		 *
		 * TODO: Integrate with LLM service
		 * Currently returns mock data
		 */
		submitMessage(conversationId: string, text: string): Promise<APIResult<LLMResponse>>;

		/**
		 * Submit message with streaming response
		 *
		 * TODO: Integrate with LLM service
		 * Currently returns mock data
		 */
		submitMessageWithStreaming(
			conversationId: string,
			text: string,
			handlers?: StreamingHandlers
		): Promise<APIResult<LLMResponse>>;

		/**
		 * Analyze a conversation
		 *
		 * TODO: Integrate with LLM service
		 * Currently returns mock data
		 */
		analyzeConversation(conversationId: string): Promise<APIResult<ConversationAnalysis>>;

		/**
		 * Generate conversation summary
		 *
		 * TODO: Integrate with LLM service
		 * Currently returns mock data
		 */
		generateSummary(conversationId: string): Promise<APIResult<ConversationSummary>>;
	};

	// Voice operations (requires third-party services)
	voice: {
		/**
		 * Transcribe audio to text
		 *
		 * TODO: Integrate with speech-to-text service
		 * Currently returns mock data
		 */
		transcribe(audio: Blob): Promise<APIResult<TranscriptionResult>>;

		/**
		 * Synthesize text to speech
		 *
		 * TODO: Integrate with text-to-speech service
		 * Currently returns mock data
		 */
		synthesize(text: string, voice?: string): Promise<APIResult<Blob>>;
	};
}

/**
 * Complete Unified API Interface
 *
 * Combines direct and delegated access into a single interface.
 * Frontend code should only interact through this interface.
 */
export interface UnifiedAPI extends DirectAccessAPI {
	/** Delegated operations (backend required) */
	delegated: DelegatedAccessAPI;

	/** Generic backend call for custom endpoints */
	backend: {
		call<T>(endpoint: string, options?: RequestInit): Promise<APIResult<T>>;
	};
}
