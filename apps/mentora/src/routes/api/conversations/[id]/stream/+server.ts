/**
 * LLM Streaming API - SSE endpoint for streaming AI responses
 *
 * Request body: { text: string }
 * Response: SSE stream with AI response chunks
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    Conversations,
    type AssignmentAIConfig,
    type ConversationState,
    type Turn,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

const DEFAULT_AI_CONFIG: AssignmentAIConfig = {
    persona: "socratic-default",
    maxTurns: 20,
    responseDelayHours: 0,
    allowStudentPromptEdit: false,
    voiceEnabled: false,
};

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: conversationId } = event.params;
    const body = await event.request.json();
    const { text } = body;

    if (!conversationId) {
        throw svelteError(400, "conversationId is required");
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
        throw svelteError(400, "Missing or empty text");
    }

    // Get conversation
    const conversationRef = firestore.doc(
        Conversations.docPath(conversationId),
    );
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
        throw svelteError(404, "Conversation not found");
    }

    const conversation = Conversations.schema.parse({
        id: conversationDoc.id,
        ...conversationDoc.data(),
    });

    // Verify ownership
    if (conversation.userId !== user.uid) {
        throw svelteError(403, "Access denied");
    }

    // Check conversation state
    if (conversation.state === "closed") {
        throw svelteError(400, "Conversation is already closed");
    }

    // Get assignment for AI config
    const assignmentDoc = await firestore
        .doc(Assignments.docPath(conversation.assignmentId))
        .get();

    if (!assignmentDoc.exists) {
        throw svelteError(404, "Assignment not found");
    }

    const assignment = Assignments.schema.parse({
        id: assignmentDoc.id,
        ...assignmentDoc.data(),
    });

    const aiConfig: AssignmentAIConfig = {
        ...DEFAULT_AI_CONFIG,
        ...(assignment as unknown as { aiConfig?: Partial<AssignmentAIConfig> })
            .aiConfig,
    };

    // Create user turn
    const now = Date.now();
    const userTurnId = `turn_${now}_user`;
    const userTurn: Turn = {
        id: userTurnId,
        type: conversation.turns.length === 0 ? "idea" : "followup",
        text: text.trim(),
        analysis: null,
        pendingStartAt: null,
        createdAt: now,
    };

    // Determine new state
    let newState: ConversationState = conversation.state;
    if (
        conversation.state === "awaiting_idea" ||
        conversation.state === "awaiting_followup"
    ) {
        newState = "adding_counterpoint";
    }

    // Update conversation with user turn
    await conversationRef.update({
        turns: [...conversation.turns, userTurn],
        state: newState,
        lastActionAt: now,
        updatedAt: now,
    });

    // TODO: Replace with real LLM streaming
    const mockResponse = getMockSocraticResponse(text, conversation.turns);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Stream response chunks
                const words = mockResponse.split(" ");
                for (let i = 0; i < words.length; i++) {
                    const chunk = i === 0 ? words[i] : " " + words[i];
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ text: chunk })}\n\n`,
                        ),
                    );
                    await new Promise((r) => setTimeout(r, 50));
                }

                // Send completion event
                const aiTurnId = `turn_${Date.now()}_ai`;
                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({
                            done: true,
                            turnId: aiTurnId,
                            fullText: mockResponse,
                        })}\n\n`,
                    ),
                );

                // Save AI turn
                const aiTurn: Turn = {
                    id: aiTurnId,
                    type: "counterpoint",
                    text: mockResponse,
                    analysis: null,
                    pendingStartAt: null,
                    createdAt: Date.now(),
                };

                const currentDoc = await conversationRef.get();
                const currentData = currentDoc.data();
                await conversationRef.update({
                    turns: [...((currentData?.turns as Turn[]) || []), aiTurn],
                    state: "awaiting_followup",
                    lastActionAt: Date.now(),
                    updatedAt: Date.now(),
                });

                controller.close();
            } catch (error) {
                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({ error: "Stream error" })}\n\n`,
                    ),
                );
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
};

function getMockSocraticResponse(userText: string, turns: Turn[]): string {
    const responses = [
        "That's an interesting perspective. What evidence or reasoning led you to this conclusion?",
        "I appreciate you sharing that view. Have you considered how someone with an opposing viewpoint might respond?",
        "Let me push back on that a bit: what assumptions are you making here, and are they well-founded?",
        "Good observation. Can you think of any counterexamples or edge cases?",
        "That's a thoughtful point. How would you defend this position against the strongest possible critique?",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
}
