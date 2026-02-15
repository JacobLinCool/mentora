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
export type {
	APIResult,
	ListOptions,
	MentoraAPIConfig,
	QueryOptions,
	TokenUsageBreakdown,
	TokenUsageTotals
} from './api/types.js';
export type {
	AddCreditsInput,
	AddCreditsResult,
	CreateConversationResult,
	DelegatedListOptions,
	JoinCourseResult
} from './contracts/api.js';
export { success, failure, tryCatch, APIErrorCode } from './api/types.js';
export type { WhereFilterOp } from 'firebase/firestore';
export type {
	AnnouncementDoc,
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
export type { Announcement, Course, Conversation, Wallet, SubmissionWithId } from './api/client.js';
