import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

export const zClassReport = z
    .object({
        content: z
            .string()
            .describe("AI-generated report content in markdown format."),
        generatedAt: zFirebaseTimestamp.describe(
            "Timestamp when the report was generated.",
        ),
        submissionCount: z
            .number()
            .int()
            .nonnegative()
            .describe(
                "Number of submissions at the time of report generation.",
            ),
    })
    .describe("AI-generated class analytics report.");
export type ClassReport = z.infer<typeof zClassReport>;

export const zAssignment = z
    .object({
        id: z
            .string()
            .min(6)
            .max(128)
            .describe("Unique identifier for the assignment."),
        courseId: z
            .string()
            .max(128)
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Course ID if the assignment belongs to a course, otherwise null.",
            ),
        topicId: z
            .string()
            .max(128)
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Topic ID if the assignment belongs to a topic, otherwise null.",
            ),
        title: z
            .string()
            .min(1)
            .max(300)
            .describe("Student-facing assignment title."),
        question: z
            .string()
            .max(2000)
            .nullable()
            .optional()
            .default(null)
            .describe(
                "The initial question prompt for the assignment. Can be a simple question, a more detailed scenario, or any text that sets the context for the student's response.",
            ),
        prompt: z
            .string()
            .min(1)
            .max(50000)
            .describe("Full prompt or directions provided to students."),
        mode: z
            .literal("instant")
            .describe("Execution mode; currently only 'instant' is supported."),
        startAt: zFirebaseTimestamp.describe(
            "When the assignment becomes available.",
        ),
        dueAt: zFirebaseTimestamp
            .nullable()
            .optional()
            .default(null)
            .describe("Due date, or null if there isn't one."),
        allowLate: z
            .boolean()
            .describe("Whether late submissions are accepted."),
        allowResubmit: z
            .boolean()
            .describe("Whether students may resubmit after submitting."),
        createdBy: z
            .string()
            .max(128)
            .describe("UID of the instructor who created the assignment."),
        createdAt: zFirebaseTimestamp.describe(
            "Timestamp when the assignment was created.",
        ),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp of the latest assignment update.",
        ),
        classReport: zClassReport
            .nullable()
            .optional()
            .default(null)
            .describe(
                "AI-generated class analytics report, or null if not yet generated.",
            ),
    })
    .describe("Assignment document stored at assignments/{assignmentId}.");
export type Assignment = z.infer<typeof zAssignment>;

export const Assignments = {
    collectionPath: () => "assignments" as const,
    docPath: (assignmentId: string) => joinPath("assignments", assignmentId),
    schema: zAssignment,
} as const;
