/**
 * Export assignment statistics as CSV
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { error as svelteError } from "@sveltejs/kit";
import { Assignments, Conversations, Courses } from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: assignmentId } = event.params;

    // Get assignment
    const assignmentDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();

    if (!assignmentDoc.exists) {
        throw svelteError(404, "Assignment not found");
    }

    const assignment = Assignments.schema.parse({
        id: assignmentDoc.id,
        ...assignmentDoc.data(),
    });

    // Verify instructor access
    if (assignment.courseId) {
        const membershipDoc = await firestore
            .doc(Courses.roster.docPath(assignment.courseId, user.uid))
            .get();

        const membership = membershipDoc.data();
        const isInstructor =
            membership?.role === "instructor" ||
            membership?.role === "ta" ||
            assignment.createdBy === user.uid;

        if (!isInstructor) {
            throw svelteError(403, "Only instructors can export statistics");
        }
    } else if (assignment.createdBy !== user.uid) {
        throw svelteError(403, "Access denied");
    }

    // Get all conversations for this assignment
    const conversationsSnapshot = await firestore
        .collection(Conversations.collectionPath())
        .where("assignmentId", "==", assignmentId)
        .get();

    // Build CSV
    const headers = [
        "User ID",
        "Status",
        "Total Turns",
        "User Turns",
        "AI Turns",
        "Initial Stance",
        "Final Stance",
        "Stance Changed",
        "Duration (minutes)",
        "Started At",
        "Last Activity At",
    ];

    const rows: string[][] = [];

    for (const doc of conversationsSnapshot.docs) {
        const conv = Conversations.schema.parse({
            id: doc.id,
            ...doc.data(),
        });

        const userTurns = conv.turns.filter(
            (t) => t.type === "idea" || t.type === "followup",
        );
        const aiTurns = conv.turns.filter(
            (t) => t.type === "counterpoint" || t.type === "summary",
        );

        const initialStance = userTurns[0]?.analysis?.stance || "N/A";
        const finalStance =
            userTurns[userTurns.length - 1]?.analysis?.stance || "N/A";
        const stanceChanged = initialStance !== finalStance ? "Yes" : "No";

        const duration =
            conv.turns.length >= 2
                ? Math.round(
                      (conv.turns[conv.turns.length - 1].createdAt -
                          conv.turns[0].createdAt) /
                          60000,
                  )
                : 0;

        rows.push([
            conv.userId,
            conv.state,
            conv.turns.length.toString(),
            userTurns.length.toString(),
            aiTurns.length.toString(),
            initialStance,
            finalStance,
            stanceChanged,
            duration.toString(),
            new Date(conv.createdAt).toISOString(),
            new Date(conv.lastActionAt).toISOString(),
        ]);
    }

    // Generate CSV content
    const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
            row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
        ),
    ].join("\n");

    const filename = `assignment_${assignmentId}_statistics_${Date.now()}.csv`;

    return new Response(csvContent, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
};
