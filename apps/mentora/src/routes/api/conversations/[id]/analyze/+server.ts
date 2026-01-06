import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";

import { Conversations, type Turn } from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: conversationId } = event.params;

    if (!conversationId) throw svelteError(400, "Conversation ID required");

    const conversationDoc = await firestore
        .doc(Conversations.docPath(conversationId))
        .get();
    if (!conversationDoc.exists)
        throw svelteError(404, "Conversation not found");

    const conversation = Conversations.schema.parse(conversationDoc.data());

    // Basic ownership check - allow if owner
    // Note: Instructors might also need to analyze.
    // Ideally we should use shared helper for complex permission logic, but keeping it simple for now as per ownership.
    if (conversation.userId !== user.uid) {
        throw svelteError(403, "Not authorized");
    }

    if (conversation.turns.length < 2) {
        throw svelteError(
            400,
            "Conversation needs at least 2 turns for analysis",
        );
    }

    // TODO: Integrate with LLM service
    const stanceProgression = conversation.turns
        .filter((t: Turn) => t.analysis?.stance)
        .map((t: Turn) => ({
            turnId: t.id,
            stance: t.analysis?.stance || "neutral",
        }));

    // TODO: Write analysis to conversation document
    // await firestore.doc(...).update({ ... });

    return json({ success: true });
};
