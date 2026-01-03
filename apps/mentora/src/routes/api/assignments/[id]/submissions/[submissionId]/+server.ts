/**
 * Submission API - Get or update a specific submission
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    AssignmentSubmissions,
    Conversations,
    Courses,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Get a specific submission
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const assignmentId = event.params.id;
    const submissionId = event.params.submissionId;

    // Get assignment
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

    // Check access - owner of submission or instructor
    const isOwner = submissionId === user.uid;
    let isInstructor = assignment.createdBy === user.uid;

    if (!isOwner && !isInstructor && assignment.courseId) {
        const membershipDoc = await firestore
            .doc(
                Courses.roster.docPath(assignment.courseId as string, user.uid),
            )
            .get();

        if (membershipDoc.exists) {
            const membership = membershipDoc.data();
            isInstructor = ["owner", "instructor"].includes(
                membership?.role as string,
            );
        }
    }

    if (!isOwner && !isInstructor) {
        throw svelteError(403, "Not authorized");
    }

    // Get submission
    const submissionDoc = await firestore
        .doc(AssignmentSubmissions.docPath(assignmentId, submissionId))
        .get();

    if (!submissionDoc.exists) {
        throw svelteError(404, "Submission not found");
    }

    const submission = {
        id: submissionDoc.id,
        ...submissionDoc.data(),
    };

    // Get conversation
    const conversationsSnapshot = await firestore
        .collection(Conversations.collectionPath())
        .where("assignmentId", "==", assignmentId)
        .where("userId", "==", submissionId)
        .limit(1)
        .get();

    let conversation = null;
    if (!conversationsSnapshot.empty) {
        const convDoc = conversationsSnapshot.docs[0];
        conversation = Conversations.schema.parse({
            id: convDoc.id,
            ...convDoc.data(),
        });
    }

    return json({
        submission,
        conversation,
    });
};

/**
 * Update submission (grade)
 */
export const PATCH: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const assignmentId = event.params.id;
    const submissionId = event.params.submissionId;

    // Get assignment
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

    // Check if user is instructor
    let isInstructor = assignment.createdBy === user.uid;

    if (!isInstructor && assignment.courseId) {
        const membershipDoc = await firestore
            .doc(
                Courses.roster.docPath(assignment.courseId as string, user.uid),
            )
            .get();

        if (membershipDoc.exists) {
            const membership = membershipDoc.data();
            isInstructor = ["owner", "instructor"].includes(
                membership?.role as string,
            );
        }
    }

    if (!isInstructor) {
        throw svelteError(403, "Only instructors can grade submissions");
    }

    // Check submission exists
    const submissionDoc = await firestore
        .doc(AssignmentSubmissions.docPath(assignmentId, submissionId))
        .get();

    if (!submissionDoc.exists) {
        throw svelteError(404, "Submission not found");
    }

    const body = await event.request.json();
    const { scoreCompletion, notes, state } = body;

    const updates: Record<string, unknown> = {};

    if (scoreCompletion !== undefined) {
        if (
            typeof scoreCompletion !== "number" ||
            scoreCompletion < 0 ||
            scoreCompletion > 100
        ) {
            throw svelteError(400, "Score must be a number between 0 and 100");
        }
        updates.scoreCompletion = scoreCompletion;
    }

    if (notes !== undefined) {
        updates.notes = notes;
    }

    if (state !== undefined) {
        if (!["submitted", "graded_complete"].includes(state)) {
            throw svelteError(400, "Invalid state");
        }
        updates.state = state;
    }

    if (Object.keys(updates).length === 0) {
        throw svelteError(400, "No updates provided");
    }

    await firestore
        .doc(AssignmentSubmissions.docPath(assignmentId, submissionId))
        .update(updates);

    const updatedDoc = await firestore
        .doc(AssignmentSubmissions.docPath(assignmentId, submissionId))
        .get();

    return json({
        id: updatedDoc.id,
        ...updatedDoc.data(),
    });
};
