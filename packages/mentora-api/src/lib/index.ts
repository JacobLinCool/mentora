// Base client export - works in any JavaScript environment
export { MentoraClient, type MentoraClientConfig } from './api/client.js';
export type { APIResult, MentoraAPIConfig, QueryOptions } from './api/types.js';
export { success, failure, tryCatch } from './api/types.js';
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
