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
 * Firestore onSnapshot for automatic UI updates (implemented in individual modules)
 *
 * @see backend.ts for delegated access implementation
 * @see users.ts, conversations.ts for subscription examples
 */

// Core client and types
export * from './client.js';
export * from './types.js';

// Backend API access
export * from './backend.js';
