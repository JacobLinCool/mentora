import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

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
        orderInTopic: z
            .number()
            .int()
            .nullable()
            .optional()
            .default(null)
            .describe("Optional ordering value within the topic."),
        title: z
            .string()
            .min(1)
            .max(300)
            .describe("Student-facing assignment title."),
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
    })
    .describe("Assignment document stored at assignments/{assignmentId}.");
export type Assignment = z.infer<typeof zAssignment>;

export const Assignments = {
    collectionPath: () => "assignments" as const,
    docPath: (assignmentId: string) => joinPath("assignments", assignmentId),
    schema: zAssignment,
} as const;
