/**
 * End Conversation API - Mark conversation as closed
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    AssignmentSubmissions,
    Conversations,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * End a conversation
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const conversationId = event.params.id;

    // Get conversation
    const conversationDoc = await firestore
        .doc(Conversations.docPath(conversationId))
        .get();

    if (!conversationDoc.exists) {
        throw svelteError(404, "Conversation not found");
    }

    const conversation = Conversations.schema.parse({
        id: conversationDoc.id,
        ...conversationDoc.data(),
    });

    // Check ownership
    if (conversation.userId !== user.uid) {
        throw svelteError(403, "Not authorized");
    }

    // Check if already closed
    if (conversation.state === "closed") {
        return json({ message: "Conversation already ended", conversation });
    }

    const now = Date.now();

    // Update conversation state
    await firestore.doc(Conversations.docPath(conversationId)).update({
        state: "closed",
        lastActionAt: now,
        updatedAt: now,
    });

    // Create or update submission
    const submissionPath = AssignmentSubmissions.docPath(
        conversation.assignmentId,
        conversation.userId,
    );

    const submissionDoc = await firestore.doc(submissionPath).get();

    if (submissionDoc.exists) {
        // Update existing submission
        await firestore.doc(submissionPath).update({
            state: "submitted",
            submittedAt: now,
        });
    } else {
        // Get assignment to check due date
        const assignmentDoc = await firestore
            .doc(Assignments.docPath(conversation.assignmentId))
            .get();

        const assignment = assignmentDoc.data();
        const isLate = assignment?.dueAt ? now > assignment.dueAt : false;

        // Create new submission
        await firestore.doc(submissionPath).set({
            userId: conversation.userId,
            state: "submitted",
            startedAt: conversation.createdAt,
            submittedAt: now,
            late: isLate,
            scoreCompletion: null,
            notes: null,
        });
    }

    // Fetch updated conversation
    const updatedDoc = await firestore
        .doc(Conversations.docPath(conversationId))
        .get();
    const updatedConversation = Conversations.schema.parse({
        id: updatedDoc.id,
        ...updatedDoc.data(),
    });

    return json({
        message: "Conversation ended successfully",
        conversation: updatedConversation,
    });
};
