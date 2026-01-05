/**
 * Conversation Summary API - Get mock AI-generated summary
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
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

    // Analyze initial and final stances
    const studentTurns = conversation.turns.filter((t) =>
        ["idea", "followup"].includes(t.type),
    );
    const initialStance = studentTurns[0]?.analysis?.stance || "undetermined";
    const finalStance =
        studentTurns[studentTurns.length - 1]?.analysis?.stance ||
        "undetermined";

    // TODO: Replace with real AI-generated summary
    // - Build conversation text from all turns
    // - Create educational assessment prompt
    // - Call generateAIResponse() to create structured summary
    // - Include analysis of critical thinking and stance evolution
    const mockSummary = `**Main Topic**: The student explored questions related to the assignment topic.

**Initial Position**: The student began with ${initialStance === "undetermined" ? "an exploratory stance" : `a ${initialStance} position`}.

**Key Arguments**: Throughout ${studentTurns.length} turns, the student engaged in thoughtful dialogue, presenting various perspectives and questions.

**Critical Thinking**: The student demonstrated engagement with the topic through their questions and responses.

**Stance Evolution**: ${initialStance !== finalStance ? "The student's perspective evolved during the discussion." : "The student maintained a consistent approach to the topic."}

**Final Position**: By the end of the conversation, the student had ${finalStance === "undetermined" ? "continued their exploration" : `developed a ${finalStance} stance`}.

**Areas for Growth**: Further exploration of specific examples and deeper analysis of alternative viewpoints could enhance understanding.`;

    return json({
        summary: {
            text: mockSummary,
            initialStance,
            finalStance,
            stanceChanged: initialStance !== finalStance,
            totalTurns: conversation.turns.length,
            studentTurns: studentTurns.length,
            duration: conversation.updatedAt - conversation.createdAt,
        },
    });
};
