// MOCK API
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * End a conversation
 * Finalizes the conversation and creates/updates the submission.
 */
export const POST: RequestHandler = async (event) => {
    const { id: conversationId } = event.params;

    if (!conversationId) throw error(400, "Conversation ID required");

    // TODO: Implement conversation ending logic here

    return json({});
};
