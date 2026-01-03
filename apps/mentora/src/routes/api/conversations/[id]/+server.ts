/**
 * Get a specific conversation
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Conversations } from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id } = event.params;

    const conversationDoc = await firestore
        .doc(Conversations.docPath(id))
        .get();

    if (!conversationDoc.exists) {
        throw svelteError(404, "Conversation not found");
    }

    const conversation = Conversations.schema.parse({
        id: conversationDoc.id,
        ...conversationDoc.data(),
    });

    // Check ownership or instructor access
    if (conversation.userId !== user.uid) {
        // TODO: Check if user is instructor of the course
        throw svelteError(403, "Access denied");
    }

    return json(conversation);
};
