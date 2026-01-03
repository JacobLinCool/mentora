/**
 * Course API - Get, Update, Delete a single course
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Courses } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Check if user has permission to modify course
 */
async function requireCoursePermission(
    courseId: string,
    userId: string,
    requiredRoles: string[] = ["owner", "instructor"],
): Promise<void> {
    const membershipDoc = await firestore
        .doc(Courses.roster.docPath(courseId, userId))
        .get();

    if (!membershipDoc.exists) {
        throw svelteError(403, "Not a member of this course");
    }

    const membership = membershipDoc.data();
    if (!membership || !requiredRoles.includes(membership.role)) {
        throw svelteError(403, "Insufficient permissions");
    }
}

/**
 * Get a course by ID
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;

    const courseDoc = await firestore.doc(Courses.docPath(courseId)).get();

    if (!courseDoc.exists) {
        throw svelteError(404, "Course not found");
    }

    const course = Courses.schema.parse({
        id: courseDoc.id,
        ...courseDoc.data(),
    });

    // Check if user has access (member or public course)
    if (course.visibility !== "public") {
        const membershipDoc = await firestore
            .doc(Courses.roster.docPath(courseId, user.uid))
            .get();

        if (
            !membershipDoc.exists ||
            membershipDoc.data()?.status !== "active"
        ) {
            throw svelteError(403, "Access denied");
        }
    }

    // Get user's role in the course
    const membershipDoc = await firestore
        .doc(Courses.roster.docPath(courseId, user.uid))
        .get();
    const userRole = membershipDoc.exists ? membershipDoc.data()?.role : null;

    return json({
        ...course,
        userRole,
    });
};

/**
 * Update a course
 */
export const PATCH: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;

    // Check permission
    await requireCoursePermission(courseId, user.uid);

    const body = await event.request.json();
    const { title, visibility, theme, description, isDemo, demoPolicy } = body;

    // Build update object
    const updates: Record<string, unknown> = {
        updatedAt: Date.now(),
    };

    if (title !== undefined) updates.title = title;
    if (visibility !== undefined) updates.visibility = visibility;
    if (theme !== undefined) updates.theme = theme;
    if (description !== undefined) updates.description = description;
    if (isDemo !== undefined) updates.isDemo = isDemo;
    if (demoPolicy !== undefined) updates.demoPolicy = demoPolicy;

    await firestore.doc(Courses.docPath(courseId)).update(updates);

    // Fetch updated document
    const updatedDoc = await firestore.doc(Courses.docPath(courseId)).get();
    const course = Courses.schema.parse({
        id: updatedDoc.id,
        ...updatedDoc.data(),
    });

    return json(course);
};

/**
 * Delete a course
 */
export const DELETE: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;

    // Only owner can delete
    await requireCoursePermission(courseId, user.uid, ["owner"]);

    // Delete course document
    await firestore.doc(Courses.docPath(courseId)).delete();

    // Note: In production, you might want to also delete:
    // - All roster entries
    // - All topics
    // - All assignments
    // This could be done via Cloud Functions or batch operations

    return json({ success: true, deleted: courseId });
};
