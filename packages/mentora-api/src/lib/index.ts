/**
 * Mentora API - Unified Data Access Layer
 *
 * This module provides a hybrid architecture for data access:
 * - Direct Access: Simple CRUD via Firestore SDK
 * - Delegated Access: Complex operations via Backend API
 * - Real-time Subscriptions: Firestore onSnapshot
 *
 * See ARCHITECTURE.md for detailed documentation.
 */

// Base client export - works in any JavaScript environment
export { MentoraClient, type MentoraClientConfig } from './api/client.js';
export type { APIResult, MentoraAPIConfig, QueryOptions } from './api/types.js';
export { success, failure, tryCatch } from './api/types.js';
export type { WhereFilterOp } from 'firebase/firestore';
export type {
	Assignment,
	CourseAnnouncement,
	CourseDoc,
	CourseMembership,
	LedgerEntry,
	Submission,
	Topic,
	Turn,
	UserProfile
} from 'mentora-firebase';
export type { Course, Conversation, Wallet } from './api/client.js';
