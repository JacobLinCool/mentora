/**
 * Mentora API with Svelte Reactivity
 * Extends base MentoraClient with $state reactivity and subscriptions
 */
import type { User } from 'firebase/auth';
import type { UserProfile } from 'mentora-firebase';
import * as AnnouncementsModule from './announcements.js';
import { MentoraClient, type MentoraClientConfig } from './client.js';
import * as CoursesModule from './courses.js';
import * as ConversationsModule from './conversations.js';
import { ProfileWatcher } from './profile.svelte.js';
import type { ReactiveState } from './state.svelte.js';
import { createState } from './state.svelte.js';
import * as UsersModule from './users.js';
import type { Conversation } from './conversations.js';
import type { Announcement } from './announcements.js';
import type { Course } from './courses.js';

// Re-export types from base client
export type {
	Assignment,
	CourseDoc,
	CourseMembership,
	LedgerEntry,
	Submission,
	Topic,
	Turn,
	UserProfile
} from 'mentora-firebase';
export type { Announcement, Course, Conversation, Wallet } from './client.js';
export { createState, type ReactiveState } from './state.svelte.js';
export type {
	APIResult,
	ListOptions,
	MentoraAPIConfig,
	QueryOptions,
	TokenUsageBreakdown,
	TokenUsageTotals
} from './types.js';
export { MentoraClient, type MentoraClientConfig } from './client.js';

/**
 * Svelte-enhanced Mentora API with reactive state
 */
export class MentoraAPI extends MentoraClient {
	#reactiveUser = $state<User | null>(null);
	#profileWatcher: ProfileWatcher;

	constructor(config: MentoraClientConfig) {
		super(config);

		this.#profileWatcher = new ProfileWatcher(this._config);

		if (this._config.environment.browser) {
			this._config.auth.onAuthStateChanged((user) => {
				this.#reactiveUser = user;
				this._currentUser = user;
				this.#profileWatcher.handleUserChange(user);
			});
		}
	}

	/**
	 * Wait for user profile to be loaded
	 */
	get profileReady(): Promise<void> {
		return this.#profileWatcher.ready;
	}

	/**
	 * Reactive current user (triggers Svelte re-renders)
	 */
	override get currentUser(): User | null {
		return this.#reactiveUser;
	}

	/**
	 * Reactive current user profile
	 */
	get currentUserProfile(): UserProfile | null {
		return this.#profileWatcher.profile;
	}

	/**
	 * Whether a user is currently authenticated (reactive)
	 */
	override get isAuthenticated(): boolean {
		return this.#reactiveUser !== null;
	}

	// User methods with additional subscription capability
	usersSubscribe = {
		subscribeToMyProfile: (state: ReactiveState<UserProfile>): void =>
			UsersModule.subscribeToMyProfile(this._config, state)
	};

	coursesSubscribe = {
		listMine: (state: ReactiveState<Course[]>, options?: import('./types.js').QueryOptions): void =>
			CoursesModule.subscribeToMyCourses(this._config, state, options)
	};

	announcementsSubscribe = {
		subscribeToMine: (
			state: ReactiveState<Announcement[]>,
			options?: import('./types.js').QueryOptions
		): void => AnnouncementsModule.subscribeToMyAnnouncements(this._config, state, options),
		subscribeToUnreadCount: (state: ReactiveState<number>): void =>
			AnnouncementsModule.subscribeToUnreadAnnouncementCount(this._config, state)
	};

	// Conversation methods with additional subscription capability
	conversationsSubscribe = {
		subscribe: (conversationId: string, state: ReactiveState<Conversation>): void =>
			ConversationsModule.subscribeToConversation(this._config, conversationId, state)
	};

	/**
	 * Create a reactive state container (Svelte $state wrapper)
	 */
	createState<T>(): ReactiveState<T> {
		return createState<T>();
	}
}
