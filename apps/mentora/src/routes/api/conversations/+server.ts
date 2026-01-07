import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { error, json } from "@sveltejs/kit";
import {
    Assignments,
    Conversations,
    Courses,
    type Conversation,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Create a new conversation (or return existing)
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const body = await event.request.json();
    const { assignmentId } = body;

    if (!assignmentId) throw error(400, "Assignment ID required");

    // 1. Get Assignment
    const assignmentDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();
    if (!assignmentDoc.exists) throw error(404, "Assignment not found");
    // Safe parse to ignore extra fields if any, but ensure validity
    const assignment = Assignments.schema.parse(assignmentDoc.data());

    // 2. Check if started
    if (assignment.startAt > Date.now()) {
        throw error(403, "Assignment has not started yet");
    }

    // 3. Check enrollment
    if (assignment.courseId) {
        const membershipDoc = await firestore
            .doc(Courses.roster.docPath(assignment.courseId, user.uid))
            .get();
        if (
            !membershipDoc.exists ||
            membershipDoc.data()?.status !== "active"
        ) {
            throw error(403, "Not enrolled in this course");
        }
    }

    // 4. Check existing
    const existingQuery = await firestore
        .collection(Conversations.collectionPath())
        .where("assignmentId", "==", assignmentId)
        .where("userId", "==", user.uid)
        .limit(1)
        .get();

    if (!existingQuery.empty) {
        const existingConv = existingQuery.docs[0];
        const data = existingConv.data()!;
        if (data.state !== "closed" || assignment.allowResubmit) {
            return json({
                id: existingConv.id,
            });
        } else {
            throw error(
                409,
                "Conversation completed and resubmission not allowed",
            );
        }
    }

    // 5. Create new
    const now = Date.now();
    const conversationRef = firestore
        .collection(Conversations.collectionPath())
        .doc();
    const conversationId = conversationRef.id;

    const conversation: Conversation = {
        assignmentId,
        userId: user.uid,
        state: "awaiting_idea",
        lastActionAt: now,
        createdAt: now,
        updatedAt: now,
        turns: [],
    };

    const validated = Conversations.schema.parse(conversation);
    await conversationRef.set(validated);

    return json({
        id: conversationId,
    });
};
