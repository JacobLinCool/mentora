/**
 * Conversation Summary API - Get AI-generated summary
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { generateAIResponse } from "$lib/server/gemini";
import { json, error as svelteError } from "@sveltejs/kit";
import { Assignments, Conversations, Courses } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Get conversation summary
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const conversationId = event.params.id;

    // Get conversation
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

    // Check access - owner or instructor
    const isOwner = conversation.userId === user.uid;
    let isInstructor = false;

    if (!isOwner) {
        // Check if user is instructor of the course
        const assignmentDoc = await firestore
            .doc(Assignments.docPath(conversation.assignmentId))
            .get();

        const assignment = assignmentDoc.data();

        if (assignment?.courseId) {
            const membershipDoc = await firestore
                .doc(Courses.roster.docPath(assignment.courseId, user.uid))
                .get();

            if (membershipDoc.exists) {
                const membership = membershipDoc.data();
                isInstructor = ["instructor", "ta"].includes(
                    membership?.role as string,
                );
            }
        }
    }

    if (!isOwner && !isInstructor) {
        throw svelteError(403, "Not authorized");
    }

    // Check if conversation has turns
    if (conversation.turns.length === 0) {
        return json({
            summary: null,
            message: "No conversation content to summarize",
        });
    }

    // Build conversation text for summary
    const conversationText = conversation.turns
        .map((turn) => {
            const speaker = ["idea", "followup"].includes(turn.type)
                ? "Student"
                : "AI";
            return `${speaker}: ${turn.text}`;
        })
        .join("\n\n");

    // Analyze initial and final stances
    const studentTurns = conversation.turns.filter((t) =>
        ["idea", "followup"].includes(t.type),
    );
    const initialStance = studentTurns[0]?.analysis?.stance || "undetermined";
    const finalStance =
        studentTurns[studentTurns.length - 1]?.analysis?.stance ||
        "undetermined";

    // Generate AI summary
    try {
        const systemPrompt = `You are an educational assessment AI. Analyze the following Socratic dialogue between a student and an AI tutor.

Provide a structured summary including:
1. Main Topic: What was the central question or topic discussed?
2. Initial Position: What was the student's initial stance?
3. Key Arguments: What main points did the student make?
4. Critical Thinking: Did the student demonstrate critical thinking? How?
5. Stance Evolution: Did the student's position change during the dialogue?
6. Final Position: What is the student's concluding stance?
7. Areas for Growth: What aspects could the student explore further?

Keep the summary concise but insightful.`;

        const result = await generateAIResponse(
            `Please summarize this Socratic dialogue:\n\n${conversationText}`,
            systemPrompt,
            [],
        );

        return json({
            summary: {
                text: result.text,
                initialStance,
                finalStance,
                stanceChanged: initialStance !== finalStance,
                totalTurns: conversation.turns.length,
                studentTurns: studentTurns.length,
                duration: conversation.updatedAt - conversation.createdAt,
            },
        });
    } catch (err) {
        console.error("Summary generation failed:", err);

        // Return basic summary without AI
        return json({
            summary: {
                text: null,
                initialStance,
                finalStance,
                stanceChanged: initialStance !== finalStance,
                totalTurns: conversation.turns.length,
                studentTurns: studentTurns.length,
                duration: conversation.updatedAt - conversation.createdAt,
                error: "AI summary generation failed",
            },
        });
    }
};
