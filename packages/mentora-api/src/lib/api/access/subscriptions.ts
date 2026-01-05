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
 */

import {
	collection,
	doc,
	onSnapshot,
	query,
	where,
	orderBy,
	limit,
	type Firestore,
	type QueryConstraint
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
	Assignments,
	Conversations,
	Courses,
	Topics,
	UserProfiles,
	Wallets,
	AssignmentSubmissions,
	type Assignment,
	type Conversation,
	type CourseDoc,
	type CourseMembership,
	type Topic,
	type UserProfile,
	type Wallet,
	type Submission
} from 'mentora-firebase';
import type { Unsubscribe, SubscriptionOptions } from './types.js';

/**
 * Subscription context
 */
export interface SubscriptionContext {
	db: Firestore;
	getCurrentUser: () => User | null;
}

/**
 * Typed subscription handlers
 */
export interface TypedSubscriptionOptions<T> {
	onData: (data: T) => void;
	onError?: (error: Error) => void;
	onLoading?: (loading: boolean) => void;
}

// ============ User Profiles ============

/**
 * Subscribe to a user profile (real-time updates)
 */
export function subscribeToProfile(
	ctx: SubscriptionContext,
	uid: string,
	options: TypedSubscriptionOptions<UserProfile>
): Unsubscribe {
	options.onLoading?.(true);

	const docRef = doc(ctx.db, UserProfiles.docPath(uid));

	return onSnapshot(
		docRef,
		(snapshot) => {
			options.onLoading?.(false);
			if (snapshot.exists()) {
				try {
					const data = UserProfiles.schema.parse(snapshot.data());
					options.onData(data);
				} catch (error) {
					options.onError?.(error instanceof Error ? error : new Error('Parse error'));
				}
			} else {
				options.onError?.(new Error('Profile not found'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

/**
 * Subscribe to current user's profile
 */
export function subscribeToMyProfile(
	ctx: SubscriptionContext,
	options: TypedSubscriptionOptions<UserProfile>
): Unsubscribe {
	const user = ctx.getCurrentUser();
	if (!user) {
		options.onError?.(new Error('Not authenticated'));
		return () => {};
	}

	return subscribeToProfile(ctx, user.uid, options);
}

// ============ Courses ============

/**
 * Subscribe to a course (real-time updates)
 */
export function subscribeToCourse(
	ctx: SubscriptionContext,
	courseId: string,
	options: TypedSubscriptionOptions<CourseDoc>
): Unsubscribe {
	options.onLoading?.(true);

	const docRef = doc(ctx.db, Courses.docPath(courseId));

	return onSnapshot(
		docRef,
		(snapshot) => {
			options.onLoading?.(false);
			if (snapshot.exists()) {
				try {
					const data = Courses.schema.parse(snapshot.data());
					options.onData(data);
				} catch (error) {
					options.onError?.(error instanceof Error ? error : new Error('Parse error'));
				}
			} else {
				options.onError?.(new Error('Course not found'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

/**
 * Subscribe to courses owned by current user
 */
export function subscribeToMyCourses(
	ctx: SubscriptionContext,
	options: TypedSubscriptionOptions<CourseDoc[]>,
	queryOptions?: { limit?: number }
): Unsubscribe {
	const user = ctx.getCurrentUser();
	if (!user) {
		options.onError?.(new Error('Not authenticated'));
		return () => {};
	}

	options.onLoading?.(true);

	const constraints: QueryConstraint[] = [
		where('ownerId', '==', user.uid),
		orderBy('createdAt', 'desc')
	];

	if (queryOptions?.limit) {
		constraints.push(limit(queryOptions.limit));
	}

	const q = query(collection(ctx.db, Courses.collectionPath()), ...constraints);

	return onSnapshot(
		q,
		(snapshot) => {
			options.onLoading?.(false);
			try {
				const courses = snapshot.docs.map((doc) => Courses.schema.parse(doc.data()));
				options.onData(courses);
			} catch (error) {
				options.onError?.(error instanceof Error ? error : new Error('Parse error'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

/**
 * Subscribe to course roster
 */
export function subscribeToCourseRoster(
	ctx: SubscriptionContext,
	courseId: string,
	options: TypedSubscriptionOptions<CourseMembership[]>
): Unsubscribe {
	options.onLoading?.(true);

	const q = query(
		collection(ctx.db, Courses.roster.collectionPath(courseId)),
		where('status', '==', 'active'),
		orderBy('joinedAt', 'desc')
	);

	return onSnapshot(
		q,
		(snapshot) => {
			options.onLoading?.(false);
			try {
				const roster = snapshot.docs.map((doc) => Courses.roster.schema.parse(doc.data()));
				options.onData(roster);
			} catch (error) {
				options.onError?.(error instanceof Error ? error : new Error('Parse error'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

// ============ Topics ============

/**
 * Subscribe to a topic (real-time updates)
 */
export function subscribeToTopic(
	ctx: SubscriptionContext,
	topicId: string,
	options: TypedSubscriptionOptions<Topic>
): Unsubscribe {
	options.onLoading?.(true);

	const docRef = doc(ctx.db, Topics.docPath(topicId));

	return onSnapshot(
		docRef,
		(snapshot) => {
			options.onLoading?.(false);
			if (snapshot.exists()) {
				try {
					const data = Topics.schema.parse(snapshot.data());
					options.onData(data);
				} catch (error) {
					options.onError?.(error instanceof Error ? error : new Error('Parse error'));
				}
			} else {
				options.onError?.(new Error('Topic not found'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

/**
 * Subscribe to topics for a course
 */
export function subscribeToCourseTopics(
	ctx: SubscriptionContext,
	courseId: string,
	options: TypedSubscriptionOptions<Topic[]>
): Unsubscribe {
	options.onLoading?.(true);

	const q = query(
		collection(ctx.db, Topics.collectionPath()),
		where('courseId', '==', courseId),
		orderBy('order', 'asc')
	);

	return onSnapshot(
		q,
		(snapshot) => {
			options.onLoading?.(false);
			try {
				const topics = snapshot.docs.map((doc) => Topics.schema.parse(doc.data()));
				options.onData(topics);
			} catch (error) {
				options.onError?.(error instanceof Error ? error : new Error('Parse error'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

// ============ Assignments ============

/**
 * Subscribe to an assignment (real-time updates)
 */
export function subscribeToAssignment(
	ctx: SubscriptionContext,
	assignmentId: string,
	options: TypedSubscriptionOptions<Assignment>
): Unsubscribe {
	options.onLoading?.(true);

	const docRef = doc(ctx.db, Assignments.docPath(assignmentId));

	return onSnapshot(
		docRef,
		(snapshot) => {
			options.onLoading?.(false);
			if (snapshot.exists()) {
				try {
					const data = Assignments.schema.parse(snapshot.data());
					options.onData(data);
				} catch (error) {
					options.onError?.(error instanceof Error ? error : new Error('Parse error'));
				}
			} else {
				options.onError?.(new Error('Assignment not found'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

/**
 * Subscribe to assignments for a course
 */
export function subscribeToCourseAssignments(
	ctx: SubscriptionContext,
	courseId: string,
	options: TypedSubscriptionOptions<Assignment[]>,
	queryOptions?: { limit?: number }
): Unsubscribe {
	options.onLoading?.(true);

	const constraints: QueryConstraint[] = [
		where('courseId', '==', courseId),
		orderBy('startAt', 'desc')
	];

	if (queryOptions?.limit) {
		constraints.push(limit(queryOptions.limit));
	}

	const q = query(collection(ctx.db, Assignments.collectionPath()), ...constraints);

	return onSnapshot(
		q,
		(snapshot) => {
			options.onLoading?.(false);
			try {
				const assignments = snapshot.docs.map((doc) => Assignments.schema.parse(doc.data()));
				options.onData(assignments);
			} catch (error) {
				options.onError?.(error instanceof Error ? error : new Error('Parse error'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

// ============ Conversations ============

/**
 * Subscribe to a conversation (real-time updates)
 */
export function subscribeToConversation(
	ctx: SubscriptionContext,
	conversationId: string,
	options: TypedSubscriptionOptions<Conversation>
): Unsubscribe {
	options.onLoading?.(true);

	const docRef = doc(ctx.db, Conversations.docPath(conversationId));

	return onSnapshot(
		docRef,
		(snapshot) => {
			options.onLoading?.(false);
			if (snapshot.exists()) {
				try {
					const data = Conversations.schema.parse(snapshot.data());
					options.onData(data);
				} catch (error) {
					options.onError?.(error instanceof Error ? error : new Error('Parse error'));
				}
			} else {
				options.onError?.(new Error('Conversation not found'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

// ============ Submissions ============

/**
 * Subscribe to a submission (real-time updates)
 */
export function subscribeToSubmission(
	ctx: SubscriptionContext,
	assignmentId: string,
	userId: string,
	options: TypedSubscriptionOptions<Submission>
): Unsubscribe {
	options.onLoading?.(true);

	const docRef = doc(ctx.db, AssignmentSubmissions.docPath(assignmentId, userId));

	return onSnapshot(
		docRef,
		(snapshot) => {
			options.onLoading?.(false);
			if (snapshot.exists()) {
				try {
					const data = AssignmentSubmissions.schema.parse(snapshot.data());
					options.onData(data);
				} catch (error) {
					options.onError?.(error instanceof Error ? error : new Error('Parse error'));
				}
			} else {
				options.onError?.(new Error('Submission not found'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

/**
 * Subscribe to my submission for an assignment
 */
export function subscribeToMySubmission(
	ctx: SubscriptionContext,
	assignmentId: string,
	options: TypedSubscriptionOptions<Submission>
): Unsubscribe {
	const user = ctx.getCurrentUser();
	if (!user) {
		options.onError?.(new Error('Not authenticated'));
		return () => {};
	}

	return subscribeToSubmission(ctx, assignmentId, user.uid, options);
}

/**
 * Subscribe to all submissions for an assignment
 */
export function subscribeToAssignmentSubmissions(
	ctx: SubscriptionContext,
	assignmentId: string,
	options: TypedSubscriptionOptions<Submission[]>,
	queryOptions?: { limit?: number }
): Unsubscribe {
	options.onLoading?.(true);

	const constraints: QueryConstraint[] = [orderBy('startedAt', 'desc')];

	if (queryOptions?.limit) {
		constraints.push(limit(queryOptions.limit));
	}

	const q = query(
		collection(ctx.db, AssignmentSubmissions.collectionPath(assignmentId)),
		...constraints
	);

	return onSnapshot(
		q,
		(snapshot) => {
			options.onLoading?.(false);
			try {
				const submissions = snapshot.docs.map((doc) =>
					AssignmentSubmissions.schema.parse(doc.data())
				);
				options.onData(submissions);
			} catch (error) {
				options.onError?.(error instanceof Error ? error : new Error('Parse error'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}

// ============ Wallets ============

/**
 * Subscribe to current user's wallet (real-time updates)
 */
export function subscribeToMyWallet(
	ctx: SubscriptionContext,
	options: TypedSubscriptionOptions<Wallet | null>
): Unsubscribe {
	const user = ctx.getCurrentUser();
	if (!user) {
		options.onError?.(new Error('Not authenticated'));
		return () => {};
	}

	options.onLoading?.(true);

	const q = query(
		collection(ctx.db, Wallets.collectionPath()),
		where('ownerId', '==', user.uid),
		where('ownerType', '==', 'user'),
		limit(1)
	);

	return onSnapshot(
		q,
		(snapshot) => {
			options.onLoading?.(false);
			try {
				if (snapshot.empty) {
					options.onData(null);
				} else {
					const data = Wallets.schema.parse(snapshot.docs[0].data());
					options.onData(data);
				}
			} catch (error) {
				options.onError?.(error instanceof Error ? error : new Error('Parse error'));
			}
		},
		(error) => {
			options.onLoading?.(false);
			options.onError?.(error);
		}
	);
}
