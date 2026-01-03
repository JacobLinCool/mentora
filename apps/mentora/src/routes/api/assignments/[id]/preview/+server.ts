/**
 * Assignment Preview API - Test AI response before publishing
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { calculateTokenCost, generateAIResponse } from "$lib/server/gemini";
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

    // Get AI config from assignment
    const aiConfig = (assignment.aiConfig as Record<string, unknown>) || {};
    const systemPrompt =
        (aiConfig.systemPrompt as string) ||
        `You are a Socratic tutor helping students explore the topic: ${assignment.title}. 
Use the Socratic method to guide students to discover insights through questioning rather than direct answers.`;

    try {
        // Generate AI response
        const result = await generateAIResponse(testMessage, systemPrompt, []);

        // Calculate estimated cost
        const tokenCost = calculateTokenCost(
            result.inputTokens,
            result.outputTokens,
        );

        return json({
            response: result.text,
            strategy: "clarify", // Default strategy for preview
            estimatedTokens: result.inputTokens + result.outputTokens,
            estimatedCost: tokenCost,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
        });
    } catch (err) {
        console.error("AI preview failed:", err);
        throw svelteError(500, "Failed to generate AI response");
    }
};
