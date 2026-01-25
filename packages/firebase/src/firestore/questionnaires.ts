import { z } from "zod";
import { joinPath, zFirebaseTimestamp } from "./shared";

const zSingleChoiceQuestion = z
    .object({
        type: z.literal("single_answer_choice"),
        questionText: z
            .string()
            .min(1)
            .max(5000)
            .describe("The text of the question."),
        options: z
            .array(z.string().min(1).max(500))
            .min(1)
            .max(100)
            .describe("Answer options for single answer choice question."),
        response: z
            .string()
            .min(1)
            .max(500)
            .nullable()
            .optional()
            .default(null)
            .describe("The selected answer option."),
    })
    .describe("Single answer choice question.");

const zMultipleChoiceQuestion = z
    .object({
        type: z.literal("multiple_answer_choice"),
        questionText: z
            .string()
            .min(1)
            .max(5000)
            .describe("The text of the question."),
        options: z
            .array(z.string().min(1).max(500))
            .min(1)
            .max(100)
            .describe("Answer options for multiple answer choice question."),
        response: z
            .array(z.string().min(1).max(500))
            .nullable()
            .optional()
            .default(null)
            .describe("The selected answer options."),
    })
    .describe("Multiple answer choice question.");

const zShortAnswerQuestion = z
    .object({
        type: z.literal("short_answer"),
        questionText: z
            .string()
            .min(1)
            .max(5000)
            .describe("The text of the question."),
        response: z
            .string()
            .min(1)
            .max(5000)
            .nullable()
            .optional()
            .default(null)
            .describe("The short answer response."),
    })
    .describe("Short answer question.");

const zSliderAnswerQuestion = z
    .object({
        type: z.literal("slider_answer"),
        questionText: z
            .string()
            .min(1)
            .max(5000)
            .describe("The text of the question."),
        minLabel: z
            .string()
            .min(1)
            .max(100)
            .describe("Label for the minimum value of the slider."),
        maxLabel: z
            .string()
            .min(1)
            .max(100)
            .describe("Label for the maximum value of the slider."),
        minValue: z.number().describe("Minimum value of the slider."),
        maxValue: z.number().describe("Maximum value of the slider."),
        step: z.number().positive().describe("Step value for the slider."),
        response: z
            .number()
            .nullable()
            .optional()
            .default(null)
            .describe("The selected slider value."),
    })
    .describe("Slider answer question.");

const zQuestion = z.object({
    question: z
        .union([
            zSingleChoiceQuestion,
            zMultipleChoiceQuestion,
            zShortAnswerQuestion,
            zSliderAnswerQuestion,
        ])
        .describe("Question in the questionnaire."),
    required: z.boolean().describe("Indicates if the question is required."),
});

export const zQuestionnaire = z
    .object({
        id: z
            .string()
            .min(6)
            .max(128)
            .describe("Unique identifier for the questionnaire."),
        courseId: z
            .string()
            .max(128)
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Course ID if the questionnaire belongs to a course, otherwise null.",
            ),
        topicId: z
            .string()
            .max(128)
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Topic ID if the questionnaire belongs to a topic, otherwise null.",
            ),
        title: z
            .string()
            .min(1)
            .max(300)
            .describe("Title of the questionnaire."),
        questions: z
            .array(zQuestion)
            .min(1)
            .max(100)
            .describe("List of questions in the questionnaire."),
        startAt: zFirebaseTimestamp.describe(
            "When the questionnaire becomes available.",
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
            .describe("UID of the instructor who created the questionnaire."),
        createdAt: zFirebaseTimestamp.describe(
            "Timestamp when the questionnaire was created.",
        ),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp of the latest questionnaire update.",
        ),
    })
    .describe(
        "Questionnaire document stored at questionnaires/{questionnaireId}.",
    );

export type Questionnaire = z.infer<typeof zQuestionnaire>;

export const Questionnaires = {
    collectionPath: () => "questionnaires" as const,
    docPath: (questionnaireId: string) =>
        joinPath("questionnaires", questionnaireId),
    schema: zQuestionnaire,
} as const;
