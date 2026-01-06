/**
 * Mentora API Module
 *
 * This module provides a unified interface for data access with a hybrid architecture:
 *
 * ## Direct Access (via Firestore SDK)
 * Simple CRUD operations executed directly for better performance:
 * - User profiles, Courses, Topics, Assignments, Submissions, Conversations, Wallets
 *
 * ## Delegated Access (via Backend API)
 * Complex operations requiring server-side processing:
 * - LLM interactions, Voice processing, Complex business logic
 *
 * ## Real-time Subscriptions
 * Firestore onSnapshot for automatic UI updates
 *
 * @see unified.ts for type definitions
 * @see access/ for implementation details
 */

// Core client and types
export * from './client.js';
export * from './types.js';

// Access layer architecture
export * from './access/index.js';
export type { DelegatedAccessContext, StreamingEvents } from './access/delegated.js';
export type { SubscriptionContext, TypedSubscriptionOptions } from './access/subscriptions.js';
