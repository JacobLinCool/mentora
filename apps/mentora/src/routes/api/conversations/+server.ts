/**
 * Create a new conversation for an assignment
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    Conversations,
    Courses,
    type Conversation,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const body = await event.request.json();
    const { assignmentId } = body;

    if (!assignmentId || typeof assignmentId !== "string") {
        throw svelteError(400, "Missing or invalid assignmentId");
    }

    // Get the assignment
    const assignmentDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();

    if (!assignmentDoc.exists) {
        throw svelteError(404, "Assignment not found");
    }

    const assignment = Assignments.schema.parse({
        id: assignmentDoc.id,
        ...assignmentDoc.data(),
    });

    // Check if assignment has started
    if (assignment.startAt > Date.now()) {
        throw svelteError(400, "Assignment has not started yet");
    }

    // Check if user is enrolled in the course (if assignment belongs to a course)
    if (assignment.courseId) {
        const membershipDoc = await firestore
            .doc(Courses.roster.docPath(assignment.courseId, user.uid))
            .get();

        if (
            !membershipDoc.exists ||
            membershipDoc.data()?.status !== "active"
        ) {
            throw svelteError(403, "Not enrolled in this course");
        }
    }

    // Check if conversation already exists
    const existingConversations = await firestore
        .collection(Conversations.collectionPath())
        .where("assignmentId", "==", assignmentId)
        .where("userId", "==", user.uid)
        .limit(1)
        .get();

    if (!existingConversations.empty) {
        const existingConv = existingConversations.docs[0];
        const data = existingConv.data();

        if (!data) {
            throw svelteError(500, "Invalid conversation data");
        }

        // If conversation exists and is not closed, return it
        if (data.state !== "closed" || assignment.allowResubmit) {
            return json({
                id: existingConv.id,
                state: data.state,
                isExisting: true,
            });
        } else {
            throw svelteError(
                400,
                "Conversation already completed and resubmission not allowed",
            );
        }
    }

    // Create new conversation
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const conversation: Conversation = {
        id: conversationId,
        assignmentId,
        userId: user.uid,
        state: "awaiting_idea",
        lastActionAt: now,
        createdAt: now,
        updatedAt: now,
        turns: [],
    };

    // Validate and save
    const validated = Conversations.schema.parse(conversation);
    await firestore.doc(Conversations.docPath(conversationId)).set(validated);

    return json(
        {
            id: conversationId,
            state: validated.state,
            isExisting: false,
        },
        { status: 201 },
    );
};

/**
 * List conversations for the authenticated user
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const url = new URL(event.request.url);
    const assignmentId = url.searchParams.get("assignmentId");
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    let query = firestore
        .collection(Conversations.collectionPath())
        .where("userId", "==", user.uid)
        .orderBy("updatedAt", "desc")
        .limit(Math.min(limit, 100));

    if (assignmentId) {
        query = query.where("assignmentId", "==", assignmentId);
    }

    const snapshot = await query.get();

    const conversations = snapshot.docs.map((doc) => {
        const data = doc.data();
        return Conversations.schema.parse({
            id: doc.id,
            ...data,
        });
    });

    return json({ conversations });
};
