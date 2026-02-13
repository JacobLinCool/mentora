/**
 * Route utilities for server handlers
 */

import { ZodError, type ZodSchema } from 'zod';
import { Courses, type CourseDoc } from 'mentora-firebase';
import {
	errorResponse,
	HttpStatus,
	jsonResponse,
	ServerErrorCode,
	type AuthContext,
	type RouteContext
} from '../types.js';

/**
 * Parse and validate request body with Zod schema
 *
 * @param request - The incoming request
 * @param schema - Zod schema to validate against
 * @returns Parsed data or throws Response error
 */
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		throw errorResponse('Invalid JSON body', HttpStatus.BAD_REQUEST, ServerErrorCode.INVALID_INPUT);
	}

	try {
		return schema.parse(body);
	} catch (error) {
		if (error instanceof ZodError) {
			const messages = error.issues.map((e: { message: string }) => e.message).join(', ');
			throw errorResponse(messages, HttpStatus.BAD_REQUEST, ServerErrorCode.INVALID_INPUT);
		}
		throw error;
	}
}

/**
 * Require authenticated user in route context
 *
 * @param ctx - Route context
 * @returns AuthContext (throws if not authenticated)
 */
export function requireAuth(ctx: RouteContext): AuthContext {
	if (!ctx.user) {
		throw errorResponse(
			'Authentication required',
			HttpStatus.UNAUTHORIZED,
			ServerErrorCode.NOT_AUTHENTICATED
		);
	}
	return ctx.user;
}

/**
 * Create a success response with data
 */
export { jsonResponse };

/**
 * Create an error response
 */
export { errorResponse };

/**
 * Require a path parameter
 *
 * @param ctx - Route context
 * @param name - Parameter name
 * @returns Parameter value (throws if missing)
 */
export function requireParam(ctx: RouteContext, name: string): string {
	const value = ctx.params[name];
	if (!value) {
		throw errorResponse(
			`${name} is required`,
			HttpStatus.BAD_REQUEST,
			ServerErrorCode.INVALID_INPUT
		);
	}
	return value;
}

/**
 * Fetch a Firestore document, verify it exists, and parse with a Zod schema.
 *
 * @param ctx - Route context (needs firestore)
 * @param docPath - Full Firestore document path
 * @param schema - Zod schema to validate the document data
 * @param entityName - Human-readable name for error messages (e.g. "Assignment")
 * @returns Parsed document data
 * @throws Response 404 if document does not exist
 */
export async function requireDocument<T>(
	ctx: RouteContext,
	docPath: string,
	schema: ZodSchema<T>,
	entityName: string = 'Document'
): Promise<T> {
	const doc = await ctx.firestore.doc(docPath).get();
	if (!doc.exists) {
		throw errorResponse(`${entityName} not found`, HttpStatus.NOT_FOUND, ServerErrorCode.NOT_FOUND);
	}
	return schema.parse(doc.data());
}

/**
 * Verify course exists and user has read access (public, owner, or active member).
 *
 * @param ctx - Route context (needs firestore)
 * @param courseId - Course document ID
 * @param userId - Authenticated user's UID
 * @param resource - Resource label for error message (e.g. "topics")
 * @returns Parsed CourseDoc
 * @throws Response 404 if course not found, 403 if access denied
 */
export async function requireCourseAccess(
	ctx: RouteContext,
	courseId: string,
	userId: string,
	resource: string
): Promise<CourseDoc> {
	const courseData = await requireDocument(
		ctx,
		Courses.docPath(courseId),
		Courses.schema,
		'Course'
	);

	let hasAccess = courseData.visibility === 'public';
	if (!hasAccess && courseData.ownerId === userId) {
		hasAccess = true;
	}
	if (!hasAccess) {
		const memberDoc = await ctx.firestore.doc(Courses.roster.docPath(courseId, userId)).get();
		if (memberDoc.exists) {
			const memberData = Courses.roster.schema.parse(memberDoc.data());
			hasAccess = memberData.status === 'active';
		}
	}

	if (!hasAccess) {
		throw errorResponse(
			`Not authorized to view course ${resource}`,
			HttpStatus.FORBIDDEN,
			ServerErrorCode.PERMISSION_DENIED
		);
	}

	return courseData;
}
