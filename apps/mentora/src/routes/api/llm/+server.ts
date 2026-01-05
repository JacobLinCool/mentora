/**
 * LLM API - All LLM-related endpoints consolidated
 *
 * This is the ONLY endpoint that requires backend processing for LLM operations.
 * All other operations are handled via direct Firestore access in mentora-api.
 *
 * Endpoints:
 * - POST /api/llm/message - Submit message, get AI response
 * - POST /api/llm/stream - Submit message, get streaming AI response
 * - POST /api/llm/analyze - Analyze conversation
 * - POST /api/llm/summary - Generate conversation summary
 * - POST /api/llm/preview - Preview AI response for assignment
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    Conversations,
    Courses,
    type Conversation,
    type Turn,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Helper: Get conversation with access check
 */
async function getConversationWithAccess(
    conversationId: string,
    userId: string,
    requireOwner: boolean = true,
): Promise<Conversation> {
    const conversationDoc = await firestore
        .doc(Conversations.docPath(conversationId))
        .get();

    if (!conversationDoc.exists) {
        throw svelteError(404, "Conversation not found");
    }

    const conversation = Conversations.schema.parse({
        id: conversationDoc.id,
        ...conversationDoc.data(),
    });

    if (requireOwner && conversation.userId !== userId) {
        // Check if user is instructor
        const assignmentDoc = await firestore
            .doc(Assignments.docPath(conversation.assignmentId))
            .get();
        const assignment = assignmentDoc.data();

        if (assignment?.courseId) {
            const membershipDoc = await firestore
                .doc(Courses.roster.docPath(assignment.courseId, userId))
                .get();

            if (membershipDoc.exists) {
                const membership = membershipDoc.data();
                if (
                    ["instructor", "ta", "owner"].includes(
                        membership?.role as string,
                    )
                ) {
                    return conversation;
                }
            }
        }
        throw svelteError(403, "Not authorized");
    }

    return conversation;
}

/**
 * All LLM operations
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const body = await event.request.json();
    const { action, conversationId, assignmentId, text, testMessage } = body;

    if (!action) {
        throw svelteError(400, "Action is required");
    }

    switch (action) {
        case "message": {
            // Non-streaming message
            if (!conversationId || !text) {
                throw svelteError(400, "conversationId and text are required");
            }

            const conversation = await getConversationWithAccess(
                conversationId,
                user.uid,
            );

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

            return json({
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
            });
        }

        case "analyze": {
            if (!conversationId) {
                throw svelteError(400, "conversationId is required");
            }

            const conversation = await getConversationWithAccess(
                conversationId,
                user.uid,
                false,
            );

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

            return json({
                overallScore: 0.65 + Math.random() * 0.25,
                stanceProgression,
                qualityMetrics: {
                    argumentClarity: 0.6 + Math.random() * 0.3,
                    evidenceUsage: 0.5 + Math.random() * 0.3,
                    criticalThinking: 0.6 + Math.random() * 0.3,
                    responseToCounterpoints: 0.55 + Math.random() * 0.3,
                },
                suggestions: [
                    "Consider providing more specific examples",
                    "Try to anticipate potential counterarguments",
                ].slice(0, 2),
                summary: `Analysis of ${conversation.turns.length}-turn conversation.`,
            });
        }

        case "summary": {
            if (!conversationId) {
                throw svelteError(400, "conversationId is required");
            }

            const conversation = await getConversationWithAccess(
                conversationId,
                user.uid,
                false,
            );

            if (conversation.turns.length === 0) {
                return json({ summary: null, message: "No content" });
            }

            // TODO: Integrate with LLM service
            const studentTurns = conversation.turns.filter(
                (t: Turn) => t.type === "idea" || t.type === "followup",
            );
            const initialStance =
                studentTurns[0]?.analysis?.stance || "undetermined";
            const finalStance =
                studentTurns[studentTurns.length - 1]?.analysis?.stance ||
                "undetermined";

            return json({
                summary: {
                    text: `Student engaged in ${studentTurns.length} turns of dialogue.`,
                    initialStance,
                    finalStance,
                    stanceChanged: initialStance !== finalStance,
                    totalTurns: conversation.turns.length,
                    studentTurns: studentTurns.length,
                    duration: conversation.updatedAt - conversation.createdAt,
                },
            });
        }

        case "preview": {
            if (!assignmentId || !testMessage) {
                throw svelteError(
                    400,
                    "assignmentId and testMessage are required",
                );
            }

            // Verify permission
            const assignmentDoc = await firestore
                .doc(Assignments.docPath(assignmentId))
                .get();

            if (!assignmentDoc.exists) {
                throw svelteError(404, "Assignment not found");
            }

            const assignment = assignmentDoc.data();

            if (assignment?.createdBy !== user.uid) {
                if (assignment?.courseId) {
                    const membershipDoc = await firestore
                        .doc(
                            Courses.roster.docPath(
                                assignment.courseId,
                                user.uid,
                            ),
                        )
                        .get();

                    if (!membershipDoc.exists) {
                        throw svelteError(403, "Not authorized");
                    }

                    const membership = membershipDoc.data();
                    if (
                        !membership ||
                        !["owner", "instructor"].includes(membership.role)
                    ) {
                        throw svelteError(403, "Not authorized");
                    }
                } else {
                    throw svelteError(403, "Not authorized");
                }
            }

            // TODO: Integrate with LLM service
            const mockResponses = [
                "That's an interesting question. What led you to this?",
                "I see where you're coming from. Can you elaborate?",
                "Let me push back: Have you considered the counterargument?",
            ];

            const responseText =
                mockResponses[Math.floor(Math.random() * mockResponses.length)];
            const inputTokens = Math.floor(testMessage.length / 4);
            const outputTokens = Math.floor(responseText.length / 4);

            return json({
                response: responseText,
                strategy: "clarify",
                estimatedTokens: inputTokens + outputTokens,
                estimatedCost:
                    (inputTokens * 0.00002 + outputTokens * 0.00006) / 100,
                inputTokens,
                outputTokens,
            });
        }

        default:
            throw svelteError(400, `Unknown action: ${action}`);
    }
};
