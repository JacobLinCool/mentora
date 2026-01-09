// MOCK API
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { error, json } from "@sveltejs/kit";

import { Conversations } from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: conversationId } = event.params;
    const body = await event.request.json();
    const { text } = body;

    if (!conversationId) throw error(400, "Conversation ID required");
    if (!text) throw error(400, "Text is required");

    // Get conversation
    const conversationDoc = await firestore
        .doc(Conversations.docPath(conversationId))
        .get();
    if (!conversationDoc.exists) throw error(404, "Conversation not found");

    const conversation = Conversations.schema.parse(conversationDoc.data());

    // Basic ownership check
    if (conversation.userId !== user.uid) {
        throw error(403, "Not authorized");
    }

    if (conversation.state === "closed") {
        throw error(400, "Conversation is closed");
    }

    // TODO: Integrate with LLM service
    // const mockResponses = [
    //     "That's an interesting perspective. What evidence supports this view?",
    //     "I see your point, but have you considered the counterargument?",
    //     "Let me push back a bit: how would you respond to critics who say...",
    //     "Good observation. What assumptions underlie your statement?",
    // ];

    // const responseText =
    //     mockResponses[Math.floor(Math.random() * mockResponses.length)];
    // const inputTokens = Math.floor(text.length / 4);
    // const outputTokens = Math.floor(responseText.length / 4);

    // TODO: Write response to Firestore 'turns' subcollection
    // const turnDoc = firestore.collection(...).doc();
    // await turnDoc.set({ ... });

    return json({});
};
