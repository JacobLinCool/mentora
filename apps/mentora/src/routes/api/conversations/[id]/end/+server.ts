// MOCK API
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    AssignmentSubmissions,
    Conversations,
    type Submission,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * End a conversation
 * Finalizes the conversation and creates/updates the submission.
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: conversationId } = event.params;

    if (!conversationId) throw svelteError(400, "Conversation ID required");

    try {
        const db = firestore as FirebaseFirestore.Firestore;
        const result = await db.runTransaction(
            async (t: FirebaseFirestore.Transaction) => {
                const conversationRef = db.doc(
                    Conversations.docPath(conversationId),
                );
                const conversationDoc = await t.get(conversationRef);

                if (!conversationDoc.exists) {
                    throw new Error("Conversation not found");
                }

                const conversation = Conversations.schema.parse(
                    conversationDoc.data(),
                );

                // Check ownership
                if (conversation.userId !== user.uid) {
                    throw new Error("Not authorized");
                }

                // Check if already closed
                if (conversation.state === "closed") {
                    return {
                        state: "closed",
                        conversation,
                        alreadyClosed: true,
                    };
                }

                const now = Date.now();

                // Update conversation
                t.update(conversationRef, {
                    state: "closed",
                    lastActionAt: now,
                    updatedAt: now,
                });

                // Create/Update Submission
                const submissionRef = db.doc(
                    AssignmentSubmissions.docPath(
                        conversation.assignmentId,
                        conversation.userId,
                    ),
                );
                const submissionDoc = await t.get(submissionRef);

                if (submissionDoc.exists) {
                    t.update(submissionRef, {
                        state: "submitted",
                        submittedAt: now,
                    });
                } else {
                    const assignmentDoc = await t.get(
                        db.doc(Assignments.docPath(conversation.assignmentId)),
                    );
                    const assignment = assignmentDoc.exists
                        ? assignmentDoc.data()
                        : null;
                    const isLate = assignment?.dueAt
                        ? now > assignment.dueAt
                        : false;

                    const submission: Submission = {
                        userId: conversation.userId,
                        state: "submitted",
                        startedAt: conversation.createdAt,
                        submittedAt: now,
                        late: isLate,
                        scoreCompletion: null,
                        notes: null,
                    };
                    // Validate schema
                    AssignmentSubmissions.schema.parse(submission);
                    t.set(submissionRef, submission);
                }

                return {
                    state: "closed",
                    conversation: {
                        ...conversation,
                        state: "closed",
                        lastActionAt: now,
                        updatedAt: now,
                    },
                    alreadyClosed: false,
                };
            },
        );

        return json(result);
    } catch (e: unknown) {
        const error = e as Error;
        if (error.message === "Conversation not found")
            throw svelteError(404, error.message);
        if (error.message === "Not authorized")
            throw svelteError(403, error.message);

        console.error("End Conversation Error:", e);
        throw svelteError(500, "Failed to end conversation");
    }
};
