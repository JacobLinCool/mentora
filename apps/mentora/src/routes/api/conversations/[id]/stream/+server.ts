/**
 * Streaming conversation endpoint using Server-Sent Events (SSE)
 *
 * This provides real-time streaming for AI responses. For full duplex
 * communication (audio), a WebSocket implementation with Durable Objects
 * would be needed.
 *
 * Flow:
 * 1. Client connects via GET request
 * 2. Server streams AI response chunks as SSE events
 * 3. Connection closes when response is complete
 */
import { GEMINI_API_KEY } from "$env/static/private";
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { buildSystemInstruction } from "$lib/server/gemini";
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

    const systemInstruction = buildSystemInstruction(
        assignment.prompt,
        aiConfig,
        assignment.title,
    );

    // Create SSE response with streaming from Gemini
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

                // Call Gemini with streaming
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            systemInstruction: {
                                parts: [{ text: systemInstruction }],
                            },
                            contents: [
                                ...conversationHistory,
                                {
                                    role: "user",
                                    parts: [{ text: text.trim() }],
                                },
                            ],
                            generationConfig: {
                                maxOutputTokens: 500,
                                temperature: 0.8,
                            },
                        }),
                    },
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Gemini streaming error:", errorText);
                    controller.enqueue(
                        encoder.encode(
                            `event: error\ndata: ${JSON.stringify({ message: "AI generation failed" })}\n\n`,
                        ),
                    );
                    controller.close();
                    return;
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error("No response body");
                }

                let fullText = "";
                let inputTokens = 0;
                let outputTokens = 0;
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                const text =
                                    data.candidates?.[0]?.content?.parts?.[0]
                                        ?.text;

                                if (text) {
                                    fullText += text;
                                    controller.enqueue(
                                        encoder.encode(
                                            `event: chunk\ndata: ${JSON.stringify({ text })}\n\n`,
                                        ),
                                    );
                                }

                                // Extract token counts from final chunk
                                if (data.usageMetadata) {
                                    inputTokens =
                                        data.usageMetadata.promptTokenCount ||
                                        0;
                                    outputTokens =
                                        data.usageMetadata
                                            .candidatesTokenCount || 0;
                                }
                            } catch {
                                // Skip invalid JSON
                            }
                        }
                    }
                }

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
