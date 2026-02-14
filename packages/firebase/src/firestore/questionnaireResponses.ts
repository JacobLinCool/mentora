import { z } from "zod";
import { joinPath, zFirebaseTimestamp } from "./shared";

// Response schemas - required versions of the question response fields
const zSingleChoiceResponse = z
    .object({
        type: z.literal("single_answer_choice"),
        response: z
            .string()
            .min(1)
            .max(500)
            .describe("The selected answer option."),
    })
    .describe("Single answer choice response.");

const zMultipleChoiceResponse = z
    .object({
        type: z.literal("multiple_answer_choice"),
        response: z
            .array(z.string().min(1).max(500))
            .min(1)
            .describe("The selected answer options."),
    })
    .describe("Multiple answer choice response.");

const zShortAnswerResponse = z
    .object({
        type: z.literal("short_answer"),
        response: z
            .string()
            .min(1)
            .max(5000)
            .describe("The short answer response."),
    })
    .describe("Short answer response.");

const zSliderAnswerResponse = z
    .object({
        type: z.literal("slider_answer"),
        response: z.number().describe("The selected slider value."),
    })
    .describe("Slider answer response.");

const zQuestionResponse = z.object({
    questionIndex: z
        .number()
        .int()
        .min(0)
        .describe("Index of the question in the questionnaire."),
    answer: z
        .union([
            zSingleChoiceResponse,
            zMultipleChoiceResponse,
            zShortAnswerResponse,
            zSliderAnswerResponse,
        ])
        .describe("The answer to the question."),
});

export const zQuestionnaireResponse = z
    .object({
        questionnaireId: z
            .string()
            .max(128)
            .describe("ID of the questionnaire being responded to."),
        userId: z
            .string()
            .max(128)
            .describe("UID of the student who submitted this response."),
        courseId: z
            .string()
            .max(128)
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Course ID if the questionnaire belongs to a course, otherwise null.",
            ),
        responses: z
            .array(zQuestionResponse)
            .min(1)
            .max(100)
            .describe("List of answers to the questionnaire questions."),
        submittedAt: zFirebaseTimestamp.describe(
            "Timestamp when the response was submitted.",
        ),
        updatedAt: zFirebaseTimestamp
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Timestamp of the last response update, or null if never updated.",
            ),
    })
    .describe(
        "Questionnaire response document stored at questionnaireResponses/{responseId}.",
    );

export type QuestionnaireResponse = z.infer<typeof zQuestionnaireResponse>;

export const QuestionnaireResponses = {
    collectionPath: () => "questionnaireResponses" as const,
    docPath: (responseId: string) =>
        joinPath("questionnaireResponses", responseId),
    schema: zQuestionnaireResponse,
} as const;
