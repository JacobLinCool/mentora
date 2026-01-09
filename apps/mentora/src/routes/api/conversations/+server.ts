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
 *
 * Uses a deterministic document ID based on userId and assignmentId
 * to prevent duplicate conversations from concurrent requests.
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
        if (!membershipDoc.exists) {
            throw error(403, "Not enrolled in this course");
        }
        const membership = Courses.roster.schema.parse(membershipDoc.data());
        if (membership.status !== "active") {
            throw error(403, "Not enrolled in this course");
        }
    }

    // 4. Use deterministic document ID to prevent duplicates
    // This ensures that concurrent requests will naturally deduplicate
    const conversationId = `${user.uid}_${assignmentId}`;
    const conversationRef = firestore.doc(
        Conversations.docPath(conversationId),
    );

    // 5. Check existing conversation
    const existingDoc = await conversationRef.get();

    if (existingDoc.exists) {
        const data = Conversations.schema.parse(existingDoc.data());
        if (data.state !== "closed" || assignment.allowResubmit) {
            return json({
                id: conversationId,
            });
        } else {
            throw error(
                409,
                "Conversation completed and resubmission not allowed",
            );
        }
    }

    // 6. Create new conversation with deterministic ID
    // Using set() with the deterministic ID naturally handles race conditions
    const now = Date.now();

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

    // Use set() which will either create or overwrite
    // In a race, both requests write the same data, so it's safe
    await conversationRef.set(validated);

    return json({
        id: conversationId,
    });
};
