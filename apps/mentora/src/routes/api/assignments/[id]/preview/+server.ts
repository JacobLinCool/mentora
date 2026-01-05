/**
 * Assignment Preview API - Test mock AI response before publishing
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Assignments, Courses } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Preview AI response for an assignment
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const assignmentId = event.params.id;

    // Get assignment
    const assignmentDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();

    if (!assignmentDoc.exists) {
        throw svelteError(404, "Assignment not found");
    }

    const assignment = {
        id: assignmentDoc.id,
        ...assignmentDoc.data(),
    } as Record<string, unknown>;

    // Check permission (must be instructor or creator)
    if (assignment.createdBy !== user.uid) {
        if (assignment.courseId) {
            const membershipDoc = await firestore
                .doc(
                    Courses.roster.docPath(
                        assignment.courseId as string,
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
                !["owner", "instructor"].includes(membership.role as string)
            ) {
                throw svelteError(
                    403,
                    "Only instructors can preview assignments",
                );
            }
        } else {
            throw svelteError(403, "Not authorized");
        }
    }

    const body = await event.request.json();
    const { testMessage } = body;

    if (!testMessage || typeof testMessage !== "string") {
        throw svelteError(400, "Test message is required");
    }

    // TODO: Replace with real AI preview
    // - Get AI config from assignment (systemPrompt, persona, etc.)
    // - Build system instruction with assignment.title and prompt
    // - Call generateAIResponse() with test message
    // - Calculate actual token cost with calculateTokenCost()
    const mockResponses = [
        "That's an interesting question. What led you to consider this perspective?",
        "I see where you're coming from. Can you elaborate on your reasoning?",
        "Let me push back on that: Have you thought about the counterargument?",
        "Good observation. What assumptions underlie your statement?",
        "That's worth exploring. How would you defend this position to a skeptic?",
    ];

    const responseText =
        mockResponses[Math.floor(Math.random() * mockResponses.length)];

    // Mock token usage
    const inputTokens = Math.floor(testMessage.length / 4);
    const outputTokens = Math.floor(responseText.length / 4);
    const tokenCost = (inputTokens * 0.00002 + outputTokens * 0.00006) / 100;

    return json({
        response: responseText,
        strategy: "clarify",
        estimatedTokens: inputTokens + outputTokens,
        estimatedCost: tokenCost,
        inputTokens,
        outputTokens,
    });
};
