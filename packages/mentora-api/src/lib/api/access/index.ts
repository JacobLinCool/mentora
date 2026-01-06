/**
 * Hybrid Access Layer Architecture
 *
 * This module provides a unified interface for data access, abstracting the underlying
 * data source from the consumer. It implements a hybrid architecture:
 *
 * ## Direct Access (Firestore SDK)
 * Simple CRUD operations are executed directly via Firestore SDK for:
 * - Better performance (no server roundtrip)
 * - Real-time subscriptions via onSnapshot
 * - Reduced backend load
 *
 * Used for:
 * - User profiles (read, update)
 * - Courses (CRUD, roster)
 * - Topics (CRUD)
 * - Assignments (CRUD)
 * - Submissions (read, basic updates)
 * - Conversations (read)
 * - Wallets (read-only)
 *
 * ## Delegated Access (Backend API)
 * Complex operations that require server-side processing:
 * - LLM interactions (streaming, analysis)
 * - Complex business logic (join course with validation)
 * - Operations requiring elevated permissions
 * - Third-party integrations
 *
 * Security: All direct Firestore operations are protected by Firestore Security Rules.
 * The client SDK only has access to documents the user is authorized to access.
 */

export * from './delegated.js';
export * from './subscriptions.js';
export type { AccessMode, HybridAccessConfig } from './types.js';
