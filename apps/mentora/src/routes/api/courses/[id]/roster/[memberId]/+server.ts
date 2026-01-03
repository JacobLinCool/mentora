/**
 * Course Member API - Update or remove a specific member
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Courses } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Update member role or status
 */
export const PATCH: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;
    const memberId = event.params.memberId;

    // Check if user is owner (only owner can change roles)
    const userMembershipDoc = await firestore
        .doc(Courses.roster.docPath(courseId, user.uid))
        .get();

    if (!userMembershipDoc.exists) {
        throw svelteError(403, "Not a member of this course");
    }

    const userMembership = userMembershipDoc.data();
    if (!userMembership || userMembership.role !== "owner") {
        throw svelteError(403, "Only course owner can modify member roles");
    }

    // Get target member
    const memberDoc = await firestore
        .doc(Courses.roster.docPath(courseId, memberId))
        .get();

    if (!memberDoc.exists) {
        throw svelteError(404, "Member not found");
    }

    const body = await event.request.json();
    const { role, status } = body;

    const updates: Record<string, unknown> = {};

    if (role !== undefined) {
        if (!["instructor", "member"].includes(role)) {
            throw svelteError(
                400,
                "Invalid role. Must be 'instructor' or 'member'",
            );
        }
        // Cannot change owner role
        const currentData = memberDoc.data();
        if (currentData?.role === "owner") {
            throw svelteError(400, "Cannot change owner role");
        }
        updates.role = role;
    }

    if (status !== undefined) {
        if (!["active", "removed"].includes(status)) {
            throw svelteError(400, "Invalid status");
        }
        updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
        throw svelteError(400, "No updates provided");
    }

    await firestore
        .doc(Courses.roster.docPath(courseId, memberId))
        .update(updates);

    const updatedDoc = await firestore
        .doc(Courses.roster.docPath(courseId, memberId))
        .get();

    return json({
        id: memberId,
        ...updatedDoc.data(),
    });
};

/**
 * Remove member from course
 */
export const DELETE: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;
    const memberId = event.params.memberId;

    // Check if user has permission (owner/instructor or self-removal)
    const userMembershipDoc = await firestore
        .doc(Courses.roster.docPath(courseId, user.uid))
        .get();

    if (!userMembershipDoc.exists) {
        throw svelteError(403, "Not a member of this course");
    }

    const userMembership = userMembershipDoc.data();
    const isSelfRemoval = memberId === user.uid;
    const isAdminRemoval =
        userMembership?.role === "owner" ||
        userMembership?.role === "instructor";

    if (!isSelfRemoval && !isAdminRemoval) {
        throw svelteError(403, "Insufficient permissions");
    }

    // Get target member
    const memberDoc = await firestore
        .doc(Courses.roster.docPath(courseId, memberId))
        .get();

    if (!memberDoc.exists) {
        throw svelteError(404, "Member not found");
    }

    // Cannot remove owner
    const memberData = memberDoc.data();
    if (memberData?.role === "owner") {
        throw svelteError(400, "Cannot remove course owner");
    }

    // Soft delete by setting status to 'removed'
    await firestore.doc(Courses.roster.docPath(courseId, memberId)).update({
        status: "removed",
    });

    return json({ success: true, removed: memberId });
};
