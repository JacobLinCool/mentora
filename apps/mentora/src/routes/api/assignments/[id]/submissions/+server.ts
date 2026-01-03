/**
 * Submissions API - List submissions for an assignment
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
 * List all submissions for an assignment (instructor only)
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const assignmentId = event.params.id;

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
        throw svelteError(403, "Only instructors can view all submissions");
    }

    const url = new URL(event.request.url);
    const status = url.searchParams.get("status"); // in_progress, submitted, graded_complete
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    let query = firestore
        .collection(AssignmentSubmissions.collectionPath(assignmentId))
        .limit(limit);

    if (status) {
        query = query.where("state", "==", status);
    }

    const snapshot = await query.get();

    const submissions = await Promise.all(
        snapshot.docs.map(async (doc) => {
            const submission = {
                id: doc.id,
                ...doc.data(),
            };

            // Get conversation for this submission
            const conversationsSnapshot = await firestore
                .collection(Conversations.collectionPath())
                .where("assignmentId", "==", assignmentId)
                .where("userId", "==", doc.id)
                .limit(1)
                .get();

            const conversationData = conversationsSnapshot.empty
                ? null
                : (conversationsSnapshot.docs[0].data() as
                      | {
                            state?: string;
                            turns?: unknown[];
                        }
                      | undefined);

            return {
                ...submission,
                conversation: conversationData
                    ? {
                          id: conversationsSnapshot.docs[0].id,
                          state: conversationData.state || "unknown",
                          turnsCount: conversationData.turns?.length || 0,
                      }
                    : null,
            };
        }),
    );

    return json({ submissions });
};
