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

    if (conversation.userId !== user.uid) {
        throw svelteError(403, "Not authorized");
    }

    if (conversation.turns.length === 0) {
        return json({ summary: null, message: "No content" });
    }

    // TODO: Integrate with LLM service
    const studentTurns = conversation.turns.filter(
        (t: Turn) => t.type === "idea" || t.type === "followup",
    );
    const initialStance = studentTurns[0]?.analysis?.stance || "undetermined";
    const finalStance =
        studentTurns[studentTurns.length - 1]?.analysis?.stance ||
        "undetermined";

    // TODO: Write summary to conversation document
    // await firestore.doc(...).update({ ... });

    return json({ success: true });
};
