import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Assignments, Courses } from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: assignmentId } = event.params;
    const body = await event.request.json();
    const { testMessage } = body;

    if (!assignmentId) throw svelteError(400, "Assignment ID required");
    if (!testMessage) throw svelteError(400, "Test message required");

    // Verify permission
    const assignmentDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();
    if (!assignmentDoc.exists) throw svelteError(404, "Assignment not found");
    // Use schema parsing if strict, or loose access for checking fields
    const assignment = assignmentDoc.data();

    // Must be owner or instructor
    if (assignment?.createdBy !== user.uid) {
        if (assignment?.courseId) {
            const membershipDoc = await firestore
                .doc(Courses.roster.docPath(assignment.courseId, user.uid))
                .get();
            const membership = membershipDoc.exists
                ? membershipDoc.data()
                : null;

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
        estimatedCost: (inputTokens * 0.00002 + outputTokens * 0.00006) / 100,
        inputTokens,
        outputTokens,
    });
};
