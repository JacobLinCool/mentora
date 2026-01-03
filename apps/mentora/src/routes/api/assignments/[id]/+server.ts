/**
 * Assignment API - Get, Update, Delete a single assignment
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Assignments, Courses } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Check if user has permission to modify assignment
 */
async function requireAssignmentPermission(
    assignmentId: string,
    userId: string,
): Promise<{ assignment: Record<string, unknown> }> {
    const assignmentDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();

    if (!assignmentDoc.exists) {
        throw svelteError(404, "Assignment not found");
    }

    const assignment = {
        id: assignmentDoc.id,
        ...assignmentDoc.data(),
    } as Record<string, unknown>;

    // Check if user is creator or has course permission
    if (assignment.createdBy === userId) {
        return { assignment };
    }

    if (assignment.courseId) {
        const membershipDoc = await firestore
            .doc(Courses.roster.docPath(assignment.courseId as string, userId))
            .get();

        if (membershipDoc.exists) {
            const membership = membershipDoc.data();
            if (
                membership &&
                ["owner", "instructor"].includes(membership.role as string)
            ) {
                return { assignment };
            }
        }
    }

    throw svelteError(403, "Insufficient permissions");
}

/**
 * Get an assignment by ID
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const assignmentId = event.params.id;

    const assignmentDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();

    if (!assignmentDoc.exists) {
        throw svelteError(404, "Assignment not found");
    }

    const assignment = {
        id: assignmentDoc.id,
        ...assignmentDoc.data(),
    } as { id: string; courseId?: string | null; [key: string]: unknown };

    // Check access
    if (assignment.courseId) {
        const courseDoc = await firestore
            .doc(Courses.docPath(assignment.courseId))
            .get();
        const course = courseDoc.data();

        if (course?.visibility !== "public") {
            const membershipDoc = await firestore
                .doc(Courses.roster.docPath(assignment.courseId, user.uid))
                .get();

            if (
                !membershipDoc.exists ||
                membershipDoc.data()?.status !== "active"
            ) {
                throw svelteError(403, "Access denied");
            }
        }
    }

    return json(assignment);
};

/**
 * Update an assignment
 */
export const PATCH: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const assignmentId = event.params.id;

    await requireAssignmentPermission(assignmentId, user.uid);

    const body = await event.request.json();
    const {
        title,
        prompt,
        startAt,
        dueAt,
        allowLate,
        allowResubmit,
        aiConfig,
        references,
        reminders,
    } = body;

    const updates: Record<string, unknown> = {
        updatedAt: Date.now(),
    };

    if (title !== undefined) updates.title = title;
    if (prompt !== undefined) updates.prompt = prompt;
    if (startAt !== undefined) updates.startAt = startAt;
    if (dueAt !== undefined) updates.dueAt = dueAt;
    if (allowLate !== undefined) updates.allowLate = allowLate;
    if (allowResubmit !== undefined) updates.allowResubmit = allowResubmit;
    if (aiConfig !== undefined) updates.aiConfig = aiConfig;
    if (references !== undefined) updates.references = references;
    if (reminders !== undefined) updates.reminders = reminders;

    await firestore.doc(Assignments.docPath(assignmentId)).update(updates);

    const updatedDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();

    return json({
        id: updatedDoc.id,
        ...updatedDoc.data(),
    });
};

/**
 * Delete an assignment
 */
export const DELETE: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const assignmentId = event.params.id;

    await requireAssignmentPermission(assignmentId, user.uid);

    await firestore.doc(Assignments.docPath(assignmentId)).delete();

    return json({ success: true, deleted: assignmentId });
};
