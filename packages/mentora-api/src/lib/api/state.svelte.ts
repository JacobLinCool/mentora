/**
 * Reactive state management using Svelte 5 runes
 */
import type { Unsubscribe } from 'firebase/firestore';

/**
 * Reactive state container using Svelte 5 runes
 */
export class ReactiveState<T> {
	#value = $state<T | null>(null);
	#loading = $state(false);
	#error = $state<string | null>(null);
	#unsubscribe: Unsubscribe | null = null;

	get value() {
		return this.#value;
	}

	get loading() {
		return this.#loading;
	}

	get error() {
		return this.#error;
	}

	set(value: T | null) {
		this.#value = value;
	}

	setLoading(loading: boolean) {
		this.#loading = loading;
	}

	setError(error: string | null) {
		this.#error = error;
	}

	cleanup() {
		if (this.#unsubscribe) {
			this.#unsubscribe();
			this.#unsubscribe = null;
		}
	}

	attachUnsubscribe(unsubscribe: Unsubscribe) {
		this.cleanup();
		this.#unsubscribe = unsubscribe;
	}
}

/**
 * Create a new reactive state
 */
export function createState<T>(): ReactiveState<T> {
	return new ReactiveState<T>();
}
