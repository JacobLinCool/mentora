import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

export const zDimensionScore = z.object({
    score: z.number().min(1).max(5),
    feedback: z.string(),
});
export type DimensionScore = z.infer<typeof zDimensionScore>;

export const zAssessmentResult = z.object({
    dimensions: z.object({
        argumentQuality: zDimensionScore,
        criticalThinking: zDimensionScore,
        principleExtraction: zDimensionScore,
        openness: zDimensionScore,
        coherence: zDimensionScore,
    }),
    overallScore: z.number().min(1).max(5),
    overallFeedback: z.string(),
    generatedAt: z.number(),
});
export type AssessmentResult = z.infer<typeof zAssessmentResult>;

export const zSubmission = z
    .object({
        userId: z
            .string()
            .max(128)
            .describe("UID of the student who owns the submission."),
        state: z
            .union([
                z.literal("in_progress"),
                z.literal("submitted"),
                z.literal("graded_complete"),
            ])
            .describe("Progress status of the submission."),
        startedAt: zFirebaseTimestamp.describe(
            "Timestamp when the student began working.",
        ),
        submittedAt: zFirebaseTimestamp
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Timestamp when the student submitted their work, if submitted.",
            ),
        late: z
            .boolean()
            .describe("Flag indicating if the submission was late."),
        scoreCompletion: z
            .number()
            .nullable()
            .optional()
            .default(null)
            .describe("Completion-style score assigned by the grader."),
        notes: z
            .string()
            .max(10000)
            .nullable()
            .optional()
            .default(null)
            .describe("Optional instructor notes or feedback."),
        assessment: zAssessmentResult
            .nullable()
            .optional()
            .default(null)
            .describe("AI-generated structured assessment."),
        assessmentError: z
            .string()
            .max(1000)
            .nullable()
            .optional()
            .default(null)
            .describe("Reason if AI assessment generation failed."),
    })
    .describe(
        "Submission document stored at assignments/{assignmentId}/submissions/{userId}.",
    );
export type Submission = z.infer<typeof zSubmission>;

export const AssignmentSubmissions = {
    collectionPath: (assignmentId: string) =>
        joinPath("assignments", assignmentId, "submissions"),
    docPath: (assignmentId: string, userId: string) =>
        joinPath("assignments", assignmentId, "submissions", userId),
    schema: zSubmission,
} as const;
