/**
 * Mentora API with Svelte Reactivity
 * Extends base MentoraClient with $state reactivity and subscriptions
 */
import type { User } from 'firebase/auth';
import type { Conversation, UserProfile } from 'mentora-firebase';
import { MentoraClient, type MentoraClientConfig } from './client.js';
import * as ConversationsModule from './conversations.js';
import { ProfileWatcher } from './profile.svelte.js';
import type { ReactiveState } from './state.svelte.js';
import { createState } from './state.svelte.js';
import * as UsersModule from './users.js';
import type { APIResult, QueryOptions } from './types.js';

// Re-export types from base client
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
export { createState, type ReactiveState } from './state.svelte.js';
export type { APIResult, MentoraAPIConfig, QueryOptions } from './types.js';
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
