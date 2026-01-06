/**
 * Real-time Subscriptions Layer
 *
 * Provides real-time data synchronization using Firestore onSnapshot.
 * Use these methods when you need automatic updates when data changes.
 *
 * Benefits:
 * - Automatic UI updates when data changes
 * - Offline support with local cache
 * - Reduced polling overhead
 *
 * Note: Subscriptions are now implemented directly in each module
 * (users.ts, conversations.ts, etc.) for better encapsulation.
 */

export * from './subscriptions.js';
export type { Unsubscribe } from './types.js';
