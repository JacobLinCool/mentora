/**
 * Profile subscription for Mentora API
 */
import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { UserProfiles, type UserProfile } from 'mentora-firebase';
import type { MentoraAPIConfig } from './types.js';
import * as UsersModule from './users.js';

export class ProfileWatcher {
	#profile = $state<UserProfile | null>(null);
	#unsubscribe: Unsubscribe | null = null;
	#readyPromise: Promise<void> | null = null;
	#readyResolve: (() => void) | null = null;
	#creationInProgress = false;
	#currentUser: User | null = null;

	constructor(private readonly config: MentoraAPIConfig) {}

	get profile() {
		return this.#profile;
	}

	get ready(): Promise<void> {
		if (!this.config.environment.browser || !this.#currentUser || this.#profile) {
			return Promise.resolve();
		}

		if (!this.#readyPromise) {
			this.#readyPromise = new Promise((resolve) => {
				this.#readyResolve = () => {
					resolve();
					this.#readyPromise = null;
					this.#readyResolve = null;
				};
			});
		}

		return this.#readyPromise;
	}

	handleUserChange(user: User | null) {
		this.#currentUser = user;

		if (!this.config.environment.browser) {
			this.#profile = null;
			this.#stopSubscription();
			this.#resolveReady();
			return;
		}

		if (!user) {
			this.#profile = null;
			this.#stopSubscription();
			this.#resolveReady();
			return;
		}

		this.#profile = null;
		this.#startSubscription(user);
	}

	cleanup() {
		this.#profile = null;
		this.#stopSubscription();
		this.#resolveReady();
	}

	#startSubscription(user: User) {
		this.#stopSubscription();

		if (!this.config.environment.browser) {
			this.#resolveReady();
			return;
		}

		const docRef = doc(this.config.db, UserProfiles.docPath(user.uid));

		this.#unsubscribe = onSnapshot(
			docRef,
			(snapshot) => {
				if (!snapshot.exists()) {
					this.#profile = null;

					if (!this.#creationInProgress) {
						this.#creationInProgress = true;
						this.#createProfileIfMissing(user).finally(() => {
							this.#creationInProgress = false;
						});
					}

					this.#resolveReady();
					return;
				}

				try {
					const profile = UserProfiles.schema.parse(snapshot.data());
					this.#profile = profile;
				} catch (error) {
					console.error('Error parsing profile snapshot:', error);
					this.#profile = null;
				}

				this.#resolveReady();
			},
			(error) => {
				console.error('Error subscribing to profile:', error);
				this.#profile = null;
				this.#resolveReady();
			}
		);
	}

	#stopSubscription() {
		if (this.#unsubscribe) {
			this.#unsubscribe();
			this.#unsubscribe = null;
		}
		this.#creationInProgress = false;
	}

	#resolveReady() {
		if (this.#readyResolve) {
			this.#readyResolve();
		}
	}

	async #createProfileIfMissing(user: User) {
		if (!this.config.environment.browser) {
			return;
		}

		const currentUser = this.config.getCurrentUser();
		if (!currentUser || currentUser.uid !== user.uid) {
			return;
		}

		try {
			const result = await UsersModule.updateMyProfile(this.config, {});
			if (!result.success) {
				console.error('Failed to create profile:', result.error);
			}
		} catch (error) {
			console.error('Unexpected error creating profile:', error);
		}
	}
}
