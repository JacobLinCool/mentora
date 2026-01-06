import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import type { LLMResponse } from "mentora-api";
import { Conversations } from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: conversationId } = event.params;
    const body = await event.request.json();
    const { text } = body;

    if (!conversationId) throw svelteError(400, "Conversation ID required");
    if (!text) throw svelteError(400, "Text is required");

    // Get conversation
    const conversationDoc = await firestore
        .doc(Conversations.docPath(conversationId))
        .get();
    if (!conversationDoc.exists)
        throw svelteError(404, "Conversation not found");

    const conversation = Conversations.schema.parse(conversationDoc.data());

    // Basic ownership check
    if (conversation.userId !== user.uid) {
        throw svelteError(403, "Not authorized");
    }

    if (conversation.state === "closed") {
        throw svelteError(400, "Conversation is closed");
    }

    // TODO: Integrate with LLM service
    const mockResponses = [
        "That's an interesting perspective. What evidence supports this view?",
        "I see your point, but have you considered the counterargument?",
        "Let me push back a bit: how would you respond to critics who say...",
        "Good observation. What assumptions underlie your statement?",
    ];

    const responseText =
        mockResponses[Math.floor(Math.random() * mockResponses.length)];
    const inputTokens = Math.floor(text.length / 4);
    const outputTokens = Math.floor(responseText.length / 4);

    const response: LLMResponse = {
        turnId: `turn_${Date.now()}_ai`,
        text: responseText,
        analysis: {
            stance: "neutral",
            quality: 0.7,
            suggestions: ["Consider more specific examples"],
        },
        tokenUsage: {
            input: inputTokens,
            output: outputTokens,
        },
    };

    return json(response);
};
