/**
 * Course route handlers
 */

import {
	Assignments,
	Courses,
	Questionnaires,
	Topics,
	type Assignment,
	type CourseDoc,
	type CourseMembership,
	type Questionnaire,
	type Topic
} from 'mentora-firebase';
import { CreateCourseSchema, CopyCourseSchema, JoinCourseSchema } from '../llm/schemas.js';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type RouteContext,
	type RouteDefinition
} from '../types.js';
import { parseBody, requireAuth, requireDocument, requireParam } from './utils.js';

const COURSE_CODE_LOCKS_COLLECTION = '_courseCodeLocks';

/**
 * POST /api/courses
 * Create a new course with code uniqueness validation
 */
async function createCourse(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = await parseBody(request, CreateCourseSchema);
	const { title, code, visibility, theme, description, isDemo, demoPolicy } = body;

	// Generate unique course code if not provided
	const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
	const prefix = sanitizedTitle.length >= 3 ? sanitizedTitle.substring(0, 3) : 'CRS';
	const courseCode = code?.toUpperCase() || `${prefix}${Date.now().toString(36).toUpperCase()}`;

	// Validate course code format
	if (!/^[A-Z0-9]{6,64}$/.test(courseCode.replace(/[-_]/g, ''))) {
		return errorResponse(
			'Invalid course code format',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	// Fast path duplicate check for legacy courses that may not have lock docs.
	const existingCourse = await ctx.firestore
		.collection(Courses.collectionPath())
		.where('code', '==', courseCode)
		.limit(1)
		.get();
	if (!existingCourse.empty) {
		return errorResponse(
			'Course code already exists',
			HttpStatus.CONFLICT,
			ServerErrorCode.ALREADY_EXISTS
		);
	}

	// Use transaction to atomically lock code and create course.
	const result = await ctx.firestore.runTransaction(async (transaction) => {
		const lockRef = ctx.firestore.collection(COURSE_CODE_LOCKS_COLLECTION).doc(courseCode);
		const lockDoc = await transaction.get(lockRef);
		if (lockDoc.exists) {
			return { error: 'duplicate' };
		}

		const courseRef = ctx.firestore.collection(Courses.collectionPath()).doc();
		const courseId = courseRef.id;
		const now = Date.now();

		const course: CourseDoc = {
			title,
			code: courseCode,
			ownerId: user.uid,
			visibility: visibility || 'private',
			passwordHash: null,
			theme: theme || null,
			description: description || null,
			thumbnail: null,
			isDemo: isDemo || false,
			demoPolicy: demoPolicy || null,
			createdAt: now,
			updatedAt: now,
			announcements: []
		};

		const validated = Courses.schema.parse(course);
		transaction.set(courseRef, validated);
		transaction.set(lockRef, {
			code: courseCode,
			courseId,
			createdAt: now,
			ownerId: user.uid
		});

		// Add owner as first member with 'instructor' role
		const membershipRef = ctx.firestore.doc(Courses.roster.docPath(courseId, user.uid));
		const membership: CourseMembership = {
			userId: user.uid,
			email: user.email,
			role: 'instructor',
			status: 'active',
			joinedAt: now
		};

		transaction.set(membershipRef, membership);

		return { courseId };
	});

	if ('error' in result && result.error === 'duplicate') {
		return errorResponse(
			'Course code already exists',
			HttpStatus.CONFLICT,
			ServerErrorCode.ALREADY_EXISTS
		);
	}

	return jsonResponse({ id: result.courseId }, HttpStatus.CREATED);
}

/**
 * POST /api/courses/:id/copy
 * Deep copy a course with topics, assignments, and questionnaires
 */
async function copyCourse(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const sourceCourseId = requireParam(ctx, 'id');
	const body = await parseBody(request, CopyCourseSchema);
	const { title, includeContent, includeRoster, isDemo } = body;

	// Get Source Course
	const sourceCourse = await requireDocument(
		ctx,
		Courses.docPath(sourceCourseId),
		Courses.schema,
		'Source course'
	);

	// Permission Check (Must be owner or instructor)
	if (sourceCourse.ownerId !== user.uid) {
		const memberDoc = await ctx.firestore
			.doc(Courses.roster.docPath(sourceCourseId, user.uid))
			.get();
		if (!memberDoc.exists) {
			return errorResponse(
				'Not authorized to copy this course',
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}
		const membership = Courses.roster.schema.parse(memberDoc.data());
		if (membership.status !== 'active' || membership.role !== 'instructor') {
			return errorResponse(
				'Not authorized to copy this course',
				HttpStatus.FORBIDDEN,
				ServerErrorCode.PERMISSION_DENIED
			);
		}
	}

	// Create New Course
	const now = Date.now();
	const newCourseRef = ctx.firestore.collection(Courses.collectionPath()).doc();
	const newCourseId = newCourseRef.id;

	// Generate new code
	const prefix = sourceCourse.code.substring(0, 50);
	const newCode = `${prefix}_CPY_${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

	const newCourse: CourseDoc = {
		...sourceCourse,
		title: title || `Copy of ${sourceCourse.title}`,
		code: newCode,
		ownerId: user.uid,
		createdAt: now,
		updatedAt: now,
		isDemo: isDemo !== undefined ? isDemo : !!sourceCourse.isDemo,
		announcements: [],
		visibility: 'private'
	};

	const validated = Courses.schema.parse(newCourse);
	await newCourseRef.set(validated);

	// Add current user as owner/instructor
	const ownerMembership: CourseMembership = {
		userId: user.uid,
		email: user.email,
		role: 'instructor',
		status: 'active',
		joinedAt: now
	};
	await ctx.firestore.doc(Courses.roster.docPath(newCourseId, user.uid)).set(ownerMembership);

	// Copy Roster (Instructors/TAs only)
	if (includeRoster) {
		const rosterQuery = await ctx.firestore
			.collection(Courses.roster.collectionPath(sourceCourseId))
			.where('role', 'in', ['instructor', 'ta'])
			.get();

		if (!rosterQuery.empty) {
			const promises: Promise<unknown>[] = [];

			for (const doc of rosterQuery.docs) {
				const member = Courses.roster.schema.parse(doc.data());
				if (member.userId === user.uid || member.status !== 'active') continue;

				const newMemberRef = ctx.firestore.doc(Courses.roster.docPath(newCourseId, doc.id));
				const newMember: CourseMembership = {
					...member,
					joinedAt: null,
					status: 'invited'
				};

				promises.push(newMemberRef.set(newMember));
			}

			await Promise.all(promises);
		}
	}

	// Copy Content (Topics, Assignments, Questionnaires)
	if (includeContent) {
		const topicIdMap = new Map<string, string>();
		const assignmentIdMap = new Map<string, string>();
		const questionnaireIdMap = new Map<string, string>();
		const writePromises: Promise<unknown>[] = [];

		const [topicsSnapshot, assignmentsSnapshot, questionnairesSnapshot] = await Promise.all([
			ctx.firestore
				.collection(Topics.collectionPath())
				.where('courseId', '==', sourceCourseId)
				.get(),
			ctx.firestore
				.collection(Assignments.collectionPath())
				.where('courseId', '==', sourceCourseId)
				.get(),
			ctx.firestore
				.collection(Questionnaires.collectionPath())
				.where('courseId', '==', sourceCourseId)
				.get()
		]);

		// Allocate new IDs first so cross-reference mapping is deterministic.
		for (const topicDoc of topicsSnapshot.docs) {
			const oldTopic = Topics.schema.parse(topicDoc.data());
			const newTopicRef = ctx.firestore.collection(Topics.collectionPath()).doc();
			topicIdMap.set(oldTopic.id, newTopicRef.id);
		}

		for (const assignmentDoc of assignmentsSnapshot.docs) {
			const oldAssignment = Assignments.schema.parse(assignmentDoc.data());
			const newAssignmentRef = ctx.firestore.collection(Assignments.collectionPath()).doc();
			assignmentIdMap.set(oldAssignment.id, newAssignmentRef.id);
		}

		for (const questionnaireDoc of questionnairesSnapshot.docs) {
			const oldQuestionnaire = Questionnaires.schema.parse(questionnaireDoc.data());
			const newQuestionnaireRef = ctx.firestore.collection(Questionnaires.collectionPath()).doc();
			questionnaireIdMap.set(oldQuestionnaire.id, newQuestionnaireRef.id);
		}

		// Copy Topics
		for (const topicDoc of topicsSnapshot.docs) {
			const oldTopic = Topics.schema.parse(topicDoc.data());
			const newTopicId = topicIdMap.get(oldTopic.id);
			if (!newTopicId) {
				continue;
			}
			const newTopicRef = ctx.firestore.doc(Topics.docPath(newTopicId));

			const remappedContents: string[] = [];
			const remappedContentTypes: Topic['contentTypes'] = [];
			for (let i = 0; i < oldTopic.contents.length; i++) {
				const contentId = oldTopic.contents[i];
				const contentType = oldTopic.contentTypes[i];
				if (!contentId || !contentType) {
					continue;
				}
				if (contentType === 'assignment') {
					const mappedId = assignmentIdMap.get(contentId);
					if (mappedId) {
						remappedContents.push(mappedId);
						remappedContentTypes.push(contentType);
					}
					continue;
				}
				if (contentType === 'questionnaire') {
					const mappedId = questionnaireIdMap.get(contentId);
					if (mappedId) {
						remappedContents.push(mappedId);
						remappedContentTypes.push(contentType);
					}
				}
			}

			const newTopic: Topic = {
				...oldTopic,
				id: newTopicId,
				courseId: newCourseId,
				contents: remappedContents,
				contentTypes: remappedContentTypes,
				createdBy: user.uid,
				createdAt: now,
				updatedAt: now
			};

			writePromises.push(newTopicRef.set(Topics.schema.parse(newTopic)));
		}

		// Copy Assignments

		for (const assignmentDoc of assignmentsSnapshot.docs) {
			const oldAssignment = Assignments.schema.parse(assignmentDoc.data());
			const newAssignmentId = assignmentIdMap.get(oldAssignment.id);
			if (!newAssignmentId) {
				continue;
			}
			const newAssignmentRef = ctx.firestore.doc(Assignments.docPath(newAssignmentId));

			const newTopicId = oldAssignment.topicId
				? topicIdMap.get(oldAssignment.topicId) || null
				: null;

			const newAssignment: Assignment = {
				...oldAssignment,
				id: newAssignmentId,
				courseId: newCourseId,
				topicId: newTopicId,
				createdBy: user.uid,
				createdAt: now,
				updatedAt: now
			};

			writePromises.push(newAssignmentRef.set(Assignments.schema.parse(newAssignment)));
		}

		// Copy Questionnaires
		for (const questionnaireDoc of questionnairesSnapshot.docs) {
			const oldQuestionnaire = Questionnaires.schema.parse(questionnaireDoc.data());
			const newQuestionnaireId = questionnaireIdMap.get(oldQuestionnaire.id);
			if (!newQuestionnaireId) {
				continue;
			}
			const newQuestionnaireRef = ctx.firestore.doc(Questionnaires.docPath(newQuestionnaireId));
			const newTopicId = oldQuestionnaire.topicId
				? topicIdMap.get(oldQuestionnaire.topicId) || null
				: null;

			const newQuestionnaire: Questionnaire = {
				...oldQuestionnaire,
				id: newQuestionnaireId,
				courseId: newCourseId,
				topicId: newTopicId,
				createdBy: user.uid,
				createdAt: now,
				updatedAt: now
			};

			writePromises.push(newQuestionnaireRef.set(Questionnaires.schema.parse(newQuestionnaire)));
		}

		await Promise.all(writePromises);
	}

	return jsonResponse({ id: newCourseId }, HttpStatus.CREATED);
}

/**
 * POST /api/courses/join
 * Join a course by enrollment code
 */
async function joinByCode(ctx: RouteContext, request: Request): Promise<Response> {
	const user = requireAuth(ctx);
	const body = await parseBody(request, JoinCourseSchema);
	const { code } = body;

	// Normalize and validate join code
	const normalizedCode = code.trim().toUpperCase();
	if (!/^[A-Z0-9]{6,64}$/.test(normalizedCode.replace(/[-_]/g, ''))) {
		return errorResponse(
			'Join code format is invalid',
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}

	// Query for course with matching code
	const coursesSnapshot = await ctx.firestore
		.collection(Courses.collectionPath())
		.where('code', '==', normalizedCode)
		.limit(1)
		.get();

	if (coursesSnapshot.empty) {
		return errorResponse(
			'Course not found with this code',
			HttpStatus.NOT_FOUND,
			ServerErrorCode.NOT_FOUND
		);
	}

	const courseDoc = coursesSnapshot.docs[0];
	const courseId = courseDoc.id;
	Courses.schema.parse(courseDoc.data());

	// Check if user is already a member
	const existingMembership = await ctx.firestore
		.doc(Courses.roster.docPath(courseId, user.uid))
		.get();

	if (existingMembership.exists) {
		const membershipData = Courses.roster.schema.parse(existingMembership.data());
		if (membershipData.status === 'active') {
			return jsonResponse({
				courseId,
				joined: false,
				alreadyMember: true
			});
		}
		// If user was previously removed or invited, update their status
		await ctx.firestore.doc(Courses.roster.docPath(courseId, user.uid)).update({
			status: 'active',
			joinedAt: Date.now()
		});

		return jsonResponse({
			courseId,
			joined: true,
			alreadyMember: false
		});
	}

	// Create new roster entry
	const membership: CourseMembership = {
		userId: user.uid,
		email: user.email,
		role: 'student',
		status: 'active',
		joinedAt: Date.now()
	};

	await ctx.firestore.doc(Courses.roster.docPath(courseId, user.uid)).set(membership);

	return jsonResponse({ courseId, joined: true }, HttpStatus.CREATED);
}

/**
 * Export route definitions
 */
export const courseRoutes: RouteDefinition[] = [
	{
		method: 'POST',
		pattern: '/courses',
		handler: createCourse,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/courses/:id/copy',
		handler: copyCourse,
		requireAuth: true
	},
	{
		method: 'POST',
		pattern: '/courses/join',
		handler: joinByCode,
		requireAuth: true
	}
];

export { createCourse, copyCourse, joinByCode };
