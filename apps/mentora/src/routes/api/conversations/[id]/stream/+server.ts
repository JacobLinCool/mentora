/**
 * Streaming conversation endpoint using Server-Sent Events (SSE)
 *
 * This provides real-time streaming for mock AI responses.
 *
 * Flow:
 * 1. Client connects via GET request
 * 2. Server streams mock AI response chunks as SSE events
 * 3. Connection closes when response is complete
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

/**
 * POST: Submit user message and receive streaming AI response
 *
 * Request body: { text: string }
 * Response: SSE stream with AI response chunks
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: conversationId } = event.params;

    const body = await event.request.json();
    const { text } = body;

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

    // Save user turn and update state
    await conversationRef.update({
        turns: [...conversation.turns, userTurn],
        state: "adding_counterpoint" as ConversationState,
        lastActionAt: now,
        updatedAt: now,
    });

    // Build conversation context
    const conversationHistory = conversation.turns.map((turn) => ({
        role: (["idea", "followup"].includes(turn.type) ? "user" : "model") as
            | "user"
            | "model",
        parts: [{ text: turn.text }],
    }));

    // Create SSE response with mock streaming
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            try {
                // Send initial event
                controller.enqueue(
                    encoder.encode(
                        `event: start\ndata: ${JSON.stringify({ turnId: userTurnId })}\n\n`,
                    ),
                );

                // TODO: Replace with real Gemini streaming API
                // - Build system instruction with buildSystemInstruction()
                // - Call Gemini streamGenerateContent endpoint
                // - Parse SSE response and forward chunks to client
                // - Extract token usage from final response metadata
                const mockResponses = [
                    "That's an interesting perspective. Can you explain what led you to that conclusion?",
                    "I appreciate your thinking on this. What evidence supports your position?",
                    "Let me challenge that idea: Have you considered the alternative viewpoint?",
                    "That's a thoughtful observation. How might someone with a different background view this?",
                    "Good point. What assumptions are you making in your argument?",
                ];

                const fullText =
                    mockResponses[
                        Math.floor(Math.random() * mockResponses.length)
                    ];

                // Simulate streaming by sending the text in chunks
                const words = fullText.split(" ");
                for (let i = 0; i < words.length; i++) {
                    const chunk = (i === 0 ? "" : " ") + words[i];

                    // Send chunk event
                    controller.enqueue(
                        encoder.encode(
                            `event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`,
                        ),
                    );

                    // Small delay to simulate streaming
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }

                const inputTokens = text.length / 4;
                const outputTokens = fullText.length / 4;

                // Save AI turn
                const aiTurnId = `turn_${Date.now()}_ai`;
                const aiTurn: Turn = {
                    id: aiTurnId,
                    type: "counterpoint",
                    text: fullText,
                    analysis: { stance: "neutral" },
                    pendingStartAt: null,
                    createdAt: Date.now(),
                };

                const updatedConversation = await conversationRef.get();
                const currentTurns = updatedConversation.data()?.turns || [];

                await conversationRef.update({
                    turns: [...currentTurns, aiTurn],
                    state: "awaiting_followup" as ConversationState,
                    lastActionAt: Date.now(),
                    updatedAt: Date.now(),
                });

                // Send completion event
                controller.enqueue(
                    encoder.encode(
                        `event: complete\ndata: ${JSON.stringify({
                            turnId: aiTurnId,
                            text: fullText,
                            tokenUsage: {
                                input: inputTokens,
                                output: outputTokens,
                            },
                        })}\n\n`,
                    ),
                );
            } catch (error) {
                console.error("Streaming error:", error);
                controller.enqueue(
                    encoder.encode(
                        `event: error\ndata: ${JSON.stringify({ message: "Streaming failed" })}\n\n`,
                    ),
                );

                // Revert state on error
                await conversationRef.update({
                    state: conversation.state,
                    updatedAt: Date.now(),
                });
            } finally {
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
