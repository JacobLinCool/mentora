import type { Questionnaire, QuestionnaireResponse } from "$lib/api";

export type UiQuestionType =
    | "single_choice"
    | "multiple_choice"
    | "short_answer"
    | "slider";

export interface UiQuestion {
    id: string;
    type: UiQuestionType;
    question: string;
    required: boolean;
    options: string[];
    placeholder?: string;
    maxLength?: number;
    minLabel?: string;
    maxLabel?: string;
    minValue?: number;
    maxValue?: number;
    step?: number;
}

export interface MentorQuestionOption {
    id: string;
    text: string;
}

export interface MentorQuestion {
    id: string;
    type: "single" | "multiple" | "text";
    question: string;
    options: MentorQuestionOption[];
    required?: boolean;
}

export type UiAnswerMap = Record<string, string | string[] | number>;

export function mapQuestionnaireFromApi(
    questions: Questionnaire["questions"] | undefined,
): UiQuestion[] {
    if (!questions) return [];

    return questions.map((entry, index) => {
        const question = entry.question;
        const id = String(index);
        const required = entry.required;

        if (question.type === "single_answer_choice") {
            return {
                id,
                required,
                type: "single_choice" as const,
                question: question.questionText,
                options: question.options,
            };
        }

        if (question.type === "multiple_answer_choice") {
            return {
                id,
                required,
                type: "multiple_choice" as const,
                question: question.questionText,
                options: question.options,
            };
        }

        if (question.type === "slider_answer") {
            return {
                id,
                required,
                type: "slider" as const,
                question: question.questionText,
                options: [],
                minLabel: question.minLabel,
                maxLabel: question.maxLabel,
                minValue: question.minValue,
                maxValue: question.maxValue,
                step: question.step,
            };
        }

        return {
            id,
            required,
            type: "short_answer" as const,
            question: question.questionText,
            options: [],
            // Keep compatibility with older payloads if these fields exist.
            placeholder:
                "placeholder" in question &&
                typeof question.placeholder === "string"
                    ? question.placeholder
                    : undefined,
            maxLength:
                "maxLength" in question &&
                typeof question.maxLength === "number"
                    ? question.maxLength
                    : undefined,
        };
    });
}

export function mapQuestionnaireToApi(
    questions: UiQuestion[] | undefined,
): Questionnaire["questions"] {
    const safeQuestions = questions ?? [];

    return safeQuestions
        .filter((question) => question.question.trim().length > 0)
        .map((question) => {
            if (question.type === "single_choice") {
                const options = question.options
                    .map((option) => option.trim())
                    .filter((option) => option.length > 0);

                return {
                    question: {
                        type: "single_answer_choice" as const,
                        questionText: question.question.trim(),
                        options: options.length > 0 ? options : ["Option"],
                    },
                    required: question.required,
                };
            }

            if (question.type === "multiple_choice") {
                const options = question.options
                    .map((option) => option.trim())
                    .filter((option) => option.length > 0);

                return {
                    question: {
                        type: "multiple_answer_choice" as const,
                        questionText: question.question.trim(),
                        options: options.length > 0 ? options : ["Option"],
                    },
                    required: question.required,
                };
            }

            if (question.type === "slider") {
                return {
                    question: {
                        type: "slider_answer" as const,
                        questionText: question.question.trim(),
                        minLabel: question.minLabel ?? "Min",
                        maxLabel: question.maxLabel ?? "Max",
                        minValue: question.minValue ?? 0,
                        maxValue: question.maxValue ?? 10,
                        step: question.step ?? 1,
                    },
                    required: question.required,
                };
            }

            return {
                question: {
                    type: "short_answer" as const,
                    questionText: question.question.trim(),
                },
                required: question.required,
            };
        });
}

export function mapMentorQuestionsFromApi(
    questions: Questionnaire["questions"] | undefined,
): MentorQuestion[] {
    return mapQuestionnaireFromApi(questions).map((question) => ({
        id: `q-${question.id}`,
        type:
            question.type === "single_choice"
                ? "single"
                : question.type === "multiple_choice"
                  ? "multiple"
                  : "text",
        question: question.question,
        options: question.options.map((option, optionIndex) => ({
            id: `q-${question.id}-opt-${optionIndex}`,
            text: option,
        })),
        required: question.required,
    }));
}

export function mapMentorQuestionsToApi(
    questions: MentorQuestion[] | undefined,
): Questionnaire["questions"] {
    const safeQuestions = questions ?? [];

    return mapQuestionnaireToApi(
        safeQuestions.map((question) => ({
            id: question.id,
            type:
                question.type === "single"
                    ? "single_choice"
                    : question.type === "multiple"
                      ? "multiple_choice"
                      : "short_answer",
            question: question.question,
            required: question.required ?? true,
            options: question.options.map((option) => option.text),
        })),
    );
}

export function mapAnswersFromApi(
    savedResponses: QuestionnaireResponse["responses"] | undefined,
    questions: UiQuestion[],
): UiAnswerMap {
    const answers: UiAnswerMap = {};
    if (!savedResponses) return answers;

    for (const response of savedResponses) {
        const targetQuestion = questions[response.questionIndex];
        if (!targetQuestion) continue;

        const answer = response.answer.response;
        if (Array.isArray(answer)) {
            answers[targetQuestion.id] = answer;
            continue;
        }

        if (targetQuestion.type === "slider" && typeof answer === "number") {
            answers[targetQuestion.id] = answer;
            continue;
        }

        answers[targetQuestion.id] =
            typeof answer === "number" ? String(answer) : answer;
    }

    return answers;
}

export function mapAnswersToApi(
    questions: UiQuestion[],
    answers: UiAnswerMap,
): QuestionnaireResponse["responses"] {
    const payload: QuestionnaireResponse["responses"] = [];

    questions.forEach((question, index) => {
        const value = answers[question.id];
        if (value === undefined) return;

        if (question.type === "multiple_choice") {
            const selected =
                Array.isArray(value) && value.length > 0
                    ? value.filter((item) => item.trim().length > 0)
                    : [];
            if (selected.length === 0) return;

            payload.push({
                questionIndex: index,
                answer: {
                    type: "multiple_answer_choice",
                    response: selected,
                },
            });
            return;
        }

        if (question.type === "slider") {
            const numValue = typeof value === "number" ? value : Number(value);
            if (Number.isNaN(numValue)) return;

            payload.push({
                questionIndex: index,
                answer: {
                    type: "slider_answer",
                    response: numValue,
                },
            });
            return;
        }

        const text = Array.isArray(value) ? value.join(",") : String(value);
        if (text.trim().length === 0) return;

        payload.push({
            questionIndex: index,
            answer: {
                type:
                    question.type === "single_choice"
                        ? "single_answer_choice"
                        : "short_answer",
                response: text,
            },
        });
    });

    return payload;
}
