import type { Questionnaire, QuestionnaireResponse } from "$lib/api";
import {
    mapAnswersFromApi,
    mapAnswersToApi,
    mapMentorQuestionsFromApi,
    mapMentorQuestionsToApi,
    mapQuestionnaireFromApi,
    mapQuestionnaireToApi,
} from "$lib/features/questionnaires/mapper";
import { describe, expect, it } from "vitest";

describe("questionnaire mapper", () => {
    const questions = [
        {
            question: {
                type: "single_answer_choice",
                questionText: "Q1",
                options: ["A", "B"],
            },
            required: true,
        },
        {
            question: {
                type: "multiple_answer_choice",
                questionText: "Q2",
                options: ["X", "Y", "Z"],
            },
            required: true,
        },
        {
            question: {
                type: "short_answer",
                questionText: "Q3",
            },
            required: false,
        },
    ] satisfies Questionnaire["questions"];

    it("maps API questions to UI questions", () => {
        const mapped = mapQuestionnaireFromApi(questions);

        expect(mapped).toEqual([
            {
                id: "0",
                type: "single_choice",
                question: "Q1",
                required: true,
                options: ["A", "B"],
            },
            {
                id: "1",
                type: "multiple_choice",
                question: "Q2",
                required: true,
                options: ["X", "Y", "Z"],
            },
            {
                id: "2",
                type: "short_answer",
                question: "Q3",
                required: false,
                options: [],
                placeholder: undefined,
                maxLength: undefined,
            },
        ]);
    });

    it("maps UI questions back to API schema", () => {
        const mapped = mapQuestionnaireFromApi(questions);
        const roundtrip = mapQuestionnaireToApi(mapped);

        expect(roundtrip).toEqual(questions);
    });

    it("maps mentor question format in both directions", () => {
        const mentorQuestions = mapMentorQuestionsFromApi(questions);
        const backToApi = mapMentorQuestionsToApi(mentorQuestions);

        expect(backToApi).toEqual(questions);
    });

    it("maps answer payloads in both directions", () => {
        const mappedQuestions = mapQuestionnaireFromApi(questions);
        const apiResponses = [
            {
                questionIndex: 0,
                answer: { type: "single_answer_choice", response: "A" },
            },
            {
                questionIndex: 1,
                answer: {
                    type: "multiple_answer_choice",
                    response: ["X", "Z"],
                },
            },
            {
                questionIndex: 2,
                answer: { type: "short_answer", response: "hello" },
            },
        ] satisfies QuestionnaireResponse["responses"];

        const answers = mapAnswersFromApi(apiResponses, mappedQuestions);
        expect(answers).toEqual({
            "0": "A",
            "1": ["X", "Z"],
            "2": "hello",
        });

        expect(mapAnswersToApi(mappedQuestions, answers)).toEqual(apiResponses);
    });
});
