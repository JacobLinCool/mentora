/**
 * Access layer types
 */

/**
 * Access mode for operations
 */
export type AccessMode = 'direct' | 'delegated';

/**
 * Configuration for hybrid access layer
 */
export interface HybridAccessConfig {
	/** Backend base URL for delegated operations */
	backendBaseUrl: string;
	/** Whether to prefer direct access when available */
	preferDirectAccess: boolean;
	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Real-time subscription options
 */
export interface SubscriptionOptions {
	/** Called when data changes */
	onData: (data: unknown) => void;
	/** Called on errors */
	onError?: (error: Error) => void;
	/** Called when loading state changes */
	onLoading?: (loading: boolean) => void;
}

/**
 * Unsubscribe function returned by subscription methods
 */
export type Unsubscribe = () => void;
