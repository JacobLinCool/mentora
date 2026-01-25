import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

export const zTopic = z
    .object({
        id: z
            .string()
            .min(6)
            .max(128)
            .describe("Unique identifier for the topic."),
        courseId: z
            .string()
            .max(128)
            .describe("Course ID this topic belongs to."),
        title: z
            .string()
            .min(1)
            .max(200)
            .describe("Student-facing topic title."),
        description: z
            .string()
            .max(2000)
            .nullable()
            .optional()
            .default(null)
            .describe("Optional topic description."),
        order: z
            .number()
            .int()
            .nullable()
            .optional()
            .default(null)
            .describe("Optional ordering value within a class."),
        createdBy: z
            .string()
            .max(128)
            .describe("UID of the instructor who created the topic."),
        createdAt: zFirebaseTimestamp.describe("Creation timestamp."),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp of the latest topic update.",
        ),
        contents: z
            .array(z.string().max(500))
            .describe(
                "Ordered list of assignment or questionnaire IDs included in this topic.",
            ),
        contentTypes: z
            .array(z.enum(["assignment", "questionnaire"]))
            .describe(
                "Ordered list of content types corresponding to the IDs in contents.",
            ),
    })
    .describe("Topic document stored at topics/{topicId}.");
export type Topic = z.infer<typeof zTopic>;

export const Topics = {
    collectionPath: () => "topics" as const,
    docPath: (topicId: string) => joinPath("topics", topicId),
    schema: zTopic,
} as const;
