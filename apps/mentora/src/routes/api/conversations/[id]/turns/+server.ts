/**
 * Add a turn to a conversation
 *
 * This endpoint handles the core Socratic dialogue loop:
 * 1. Validate and save user's turn
 * 2. Generate mock AI response
 * 3. Analyze and save AI turn
 * 4. Update conversation state
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    Conversations,
    Wallets,
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
    dialecticalConfig: {
        enabledStrategies: ["clarify", "challenge", "devils_advocate"],
    },
    autoTermination: {
        enabled: true,
        conditions: ["max_turns_reached", "student_reached_conclusion"],
    },
};

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: conversationId } = event.params;

    const body = await event.request.json();
    const { text, type = "idea" } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
        throw svelteError(400, "Missing or empty text");
    }

    if (text.length > 20000) {
        throw svelteError(400, "Text too long (max 20000 characters)");
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

    if (
        conversation.state === "adding_counterpoint" ||
        conversation.state === "adding_final_summary"
    ) {
        throw svelteError(400, "AI is currently responding, please wait");
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

    // Get AI config from assignment (or use defaults)
    const aiConfig: AssignmentAIConfig = {
        ...DEFAULT_AI_CONFIG,
        ...(assignment as unknown as { aiConfig?: Partial<AssignmentAIConfig> })
            .aiConfig,
    };

    const now = Date.now();

    // Create user turn
    const userTurnId = `turn_${now}_user`;
    const userTurn: Turn = {
        id: userTurnId,
        type: type === "followup" ? "followup" : "idea",
        text: text.trim(),
        analysis: null,
        pendingStartAt: null,
        createdAt: now,
    };

    // Update state to indicate AI is processing
    const processingState: ConversationState = "adding_counterpoint";

    await conversationRef.update({
        turns: [...conversation.turns, userTurn],
        state: processingState,
        lastActionAt: now,
        updatedAt: now,
    });

    try {
        // TODO: Replace mock AI response with real LLM integration
        // - Implement analyzeStudentResponse() to suggest dialectical strategy
        // - Call generateAIResponse() with proper system instruction and conversation history
        // - Use assignment.prompt and aiConfig to build context
        const mockResponses = [
            "That's an interesting perspective. Can you explain what led you to that conclusion?",
            "I appreciate your thinking on this. What evidence supports your position?",
            "Let me challenge that idea: Have you considered the alternative viewpoint?",
            "That's a thoughtful observation. How might someone with a different background view this?",
            "Good point. What assumptions are you making in your argument?",
        ];

        const aiResponseText =
            mockResponses[Math.floor(Math.random() * mockResponses.length)];

        // TODO: Implement real analysis from LLM response
        const analysis = {
            suggestedStrategy: "clarify" as const,
            confidence: 0.85,
        };

        // Mock token usage - roughly estimated
        const inputTokens = text.length / 4;
        const outputTokens = aiResponseText.length / 4;
        const cost = (inputTokens * 0.00002 + outputTokens * 0.00006) / 100; // Small mock cost

        // Create AI turn
        const aiTurnId = `turn_${Date.now()}_ai`;
        const aiTurn: Turn = {
            id: aiTurnId,
            type: "counterpoint",
            text: aiResponseText,
            analysis: {
                stance: "neutral",
            },
            pendingStartAt: null,
            createdAt: Date.now(),
        };

        // TODO: Implement intelligent conversation termination logic
        // - Use shouldTerminateConversation() to analyze conversation flow
        // - Check for student reaching conclusion, coherent position, etc.
        // - Consider aiConfig.autoTermination settings
        const allTurns = [...conversation.turns, userTurn, aiTurn];
        const shouldEnd = allTurns.length >= (aiConfig.maxTurns || 20) * 2;

        let newState: ConversationState = "awaiting_followup";
        let terminationReason = null;

        if (shouldEnd) {
            newState = "closed";
            terminationReason = "max_turns_reached";
        }

        // Update conversation with AI response
        await conversationRef.update({
            turns: [...conversation.turns, userTurn, aiTurn],
            state: newState,
            lastActionAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Record cost in wallet (simplified - would need proper wallet lookup)
        try {
            await recordConversationCost(
                user.uid,
                conversationId,
                cost,
                inputTokens,
                outputTokens,
            );
        } catch (costError) {
            console.error("Failed to record cost:", costError);
            // Don't fail the request for cost tracking errors
        }

        return json({
            userTurn: {
                id: userTurnId,
                type: userTurn.type,
                text: userTurn.text,
                createdAt: userTurn.createdAt,
            },
            aiTurn: {
                id: aiTurnId,
                type: aiTurn.type,
                text: aiTurn.text,
                analysis: {
                    strategy: analysis.suggestedStrategy,
                },
                createdAt: aiTurn.createdAt,
            },
            state: newState,
            tokenUsage: {
                input: inputTokens,
                output: outputTokens,
                cost,
            },
            terminated: shouldEnd,
            terminationReason,
        });
    } catch (error) {
        console.error("Mock AI generation error:", error);

        // Revert state on error
        await conversationRef.update({
            state: conversation.state,
            updatedAt: Date.now(),
        });

        throw svelteError(500, "Failed to generate mock AI response");
    }
};

/**
 * Record conversation cost in user's wallet
 */
async function recordConversationCost(
    userId: string,
    conversationId: string,
    cost: number,
    inputTokens: number,
    outputTokens: number,
): Promise<void> {
    // Find user's wallet
    const walletQuery = await firestore
        .collection(Wallets.collectionPath())
        .where("ownerId", "==", userId)
        .where("ownerType", "==", "user")
        .limit(1)
        .get();

    if (walletQuery.empty) {
        // No wallet found, skip cost recording
        return;
    }

    const walletDoc = walletQuery.docs[0];
    const walletId = walletDoc.id;
    const walletData = walletDoc.data();

    if (!walletData) {
        return;
    }

    // Create ledger entry
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ledgerEntry = {
        id: entryId,
        type: "charge",
        amountCredits: -cost,
        scope: {
            conversationId,
        },
        provider: {
            name: "mock-ai",
            ref: null,
        },
        metadata: {
            inputTokens,
            outputTokens,
        },
        createdAt: Date.now(),
    };

    // Update wallet balance (non-transactional for REST client)
    const currentBalance = walletData.balanceCredits || 0;
    await firestore.doc(Wallets.docPath(walletId)).update({
        balanceCredits: currentBalance - cost,
        updatedAt: Date.now(),
    });

    // Add ledger entry
    await firestore
        .doc(Wallets.entries.docPath(walletId, entryId))
        .set(ledgerEntry);
}
