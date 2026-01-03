/**
 * Course Roster API - List and manage course members
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Courses, type CourseMembership } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Check if user has permission to view/modify roster
 */
async function requireRosterPermission(
    courseId: string,
    userId: string,
    requiredRoles: string[] = ["instructor", "ta"],
): Promise<string> {
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

    return membership.role;
}

/**
 * Get course roster
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;

    // Check if user has access to view roster
    await requireRosterPermission(courseId, user.uid, [
        "instructor",
        "ta",
        "student",
        "auditor",
    ]);

    const url = new URL(event.request.url);
    const status = url.searchParams.get("status") || "active";
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    let query = firestore
        .collection(Courses.roster.collectionPath(courseId))
        .limit(limit);

    if (status !== "all") {
        query = query.where("status", "==", status);
    }

    const snapshot = await query.get();

    const members = snapshot.docs.map((doc) => {
        const data = doc.data();
        return Courses.roster.schema.parse({
            ...data,
            id: doc.id,
        });
    });

    return json({ members });
};

/**
 * Add member to course (invite)
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;

    // Only owner/instructor can invite
    await requireRosterPermission(courseId, user.uid);

    const body = await event.request.json();
    const { email, role } = body;

    if (!email || typeof email !== "string") {
        throw svelteError(400, "Email is required");
    }

    const memberRole = role || "member";
    if (!["instructor", "member"].includes(memberRole)) {
        throw svelteError(
            400,
            "Invalid role. Must be 'instructor' or 'member'",
        );
    }

    // Check if email already has membership
    const existingMembers = await firestore
        .collection(Courses.roster.collectionPath(courseId))
        .where("email", "==", email.toLowerCase())
        .limit(1)
        .get();

    if (!existingMembers.empty) {
        const existingDoc = existingMembers.docs[0];
        const existing = existingDoc?.data();
        if (existing?.status === "active") {
            throw svelteError(409, "User is already a member of this course");
        }
        if (existing?.status === "invited") {
            throw svelteError(409, "User has already been invited");
        }
    }

    // Create invitation
    const memberId = `member_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const membership: CourseMembership = {
        userId: null, // Will be set when user accepts invitation
        email: email.toLowerCase(),
        role: memberRole,
        status: "invited",
        joinedAt: null,
    };

    await firestore
        .doc(Courses.roster.docPath(courseId, memberId))
        .set(membership);

    return json({ id: memberId, ...membership }, { status: 201 });
};
