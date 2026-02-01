import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    assertFails,
    assertSucceeds,
    clearFirestore,
    setup,
    teardown,
} from "./setup";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
    testEnv = await setup();
});

afterAll(async () => {
    await teardown();
});

beforeEach(async () => {
    await clearFirestore();
});

/** Helper to create a valid questionnaire response document */
function createResponseData(overrides: Record<string, unknown> = {}) {
    return {
        questionnaireId: "questionnaire123",
        userId: "student456",
        courseId: null,
        responses: [
            {
                questionIndex: 0,
                answer: {
                    type: "single_answer_choice",
                    response: "Red",
                },
            },
        ],
        submittedAt: Date.now(),
        ...overrides,
    };
}

describe("QuestionnaireResponses Security Rules", () => {
    describe("Read Access", () => {
        it("should allow student to read their own response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaireResponses").doc(responseId).get(),
            );
        });

        it("should allow instructors to read student responses in their course", async () => {
            const responseId = "response123";
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const instructorId = "instructor789";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                // Create course
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                // Add instructor to roster
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(instructorId)
                    .set({
                        userId: instructorId,
                        email: "instructor@example.com",
                        role: "instructor",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                // Create questionnaire
                await fs.collection("questionnaires").doc(questionnaireId).set({
                    id: questionnaireId,
                    courseId: courseId,
                    topicId: null,
                    title: "Test Questionnaire",
                    questions: [],
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: instructorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                // Create student response
                await fs
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            questionnaireId: questionnaireId,
                            userId: studentId,
                            courseId: courseId,
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaireResponses").doc(responseId).get(),
            );
        });

        it("should deny other students from reading someone else's response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const otherStudentId = "student789";
            const db = testEnv.authenticatedContext(otherStudentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaireResponses").doc(responseId).get(),
            );
        });

        it("should deny non-course members from reading responses", async () => {
            const responseId = "response123";
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student456";
            const outsiderId = "outsider999";
            const db = testEnv.authenticatedContext(outsiderId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("questionnaires").doc(questionnaireId).set({
                    id: questionnaireId,
                    courseId: courseId,
                    topicId: null,
                    title: "Test Questionnaire",
                    questions: [],
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            questionnaireId: questionnaireId,
                            userId: studentId,
                            courseId: courseId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaireResponses").doc(responseId).get(),
            );
        });

        it("should allow querying own responses", async () => {
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaireResponses")
                    .doc("r1")
                    .set(
                        createResponseData({
                            userId: studentId,
                        }),
                    );
            });

            const result = await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .where("userId", "==", studentId)
                    .get(),
            );
            expect(result.size).toBe(1);
        });

        it("should allow instructors to query all responses for a questionnaire in their course", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const instructorId = "instructor789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(instructorId)
                    .set({
                        userId: instructorId,
                        email: "instructor@example.com",
                        role: "instructor",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs.collection("questionnaires").doc(questionnaireId).set({
                    id: questionnaireId,
                    courseId: courseId,
                    topicId: null,
                    title: "Test Questionnaire",
                    questions: [],
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: instructorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("questionnaireResponses")
                    .doc("r1")
                    .set(
                        createResponseData({
                            questionnaireId: questionnaireId,
                            userId: "student1",
                            courseId: courseId,
                        }),
                    );
                await fs
                    .collection("questionnaireResponses")
                    .doc("r2")
                    .set(
                        createResponseData({
                            questionnaireId: questionnaireId,
                            userId: "student2",
                            courseId: courseId,
                        }),
                    );
            });

            const result = await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .where("questionnaireId", "==", questionnaireId)
                    .get(),
            );
            expect(result.size).toBe(2);
        });

        it("should deny instructors from reading responses with forged courseId", async () => {
            const responseId = "response123";
            const questionnaireId = "questionnaire123";
            const realCourseId = "course456";
            const forgedCourseId = "course789";
            const instructorId = "instructor999";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                // Create real course
                await fs.collection("courses").doc(realCourseId).set({
                    id: realCourseId,
                    title: "Real Course",
                    code: "REAL123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                // Create forged course where instructor has access
                await fs.collection("courses").doc(forgedCourseId).set({
                    id: forgedCourseId,
                    title: "Forged Course",
                    code: "FAKE123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(forgedCourseId)
                    .collection("roster")
                    .doc(instructorId)
                    .set({
                        userId: instructorId,
                        email: "instructor@example.com",
                        role: "instructor",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                // Create questionnaire in real course
                await fs.collection("questionnaires").doc(questionnaireId).set({
                    id: questionnaireId,
                    courseId: realCourseId,
                    topicId: null,
                    title: "Test Questionnaire",
                    questions: [],
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                // Create response with forged courseId
                await fs
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            questionnaireId: questionnaireId,
                            userId: studentId,
                            courseId: forgedCourseId, // Forged courseId!
                        }),
                    );
            });

            // Instructor should NOT be able to read this response
            await assertFails(
                db.collection("questionnaireResponses").doc(responseId).get(),
            );
        });
    });

    describe("Create Access", () => {
        it("should allow student to create their own response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                        }),
                    ),
            );
        });

        it("should deny student from creating response for another user", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const otherStudentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: otherStudentId,
                        }),
                    ),
            );
        });

        it("should deny unauthenticated users from creating responses", async () => {
            const responseId = "response123";
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(createResponseData()),
            );
        });

        it("should deny creating response with empty responses array", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [],
                        }),
                    ),
            );
        });
    });

    describe("Update Access", () => {
        it("should allow student to update their own response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                        }),
                    );
            });

            await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .update({
                        responses: [
                            {
                                questionIndex: 0,
                                answer: {
                                    type: "single_answer_choice",
                                    response: "Blue",
                                },
                            },
                        ],
                        submittedAt: Date.now(),
                    }),
            );
        });

        it("should deny student from updating someone else's response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const otherStudentId = "student789";
            const db = testEnv.authenticatedContext(otherStudentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                        }),
                    );
            });

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .update({
                        responses: [
                            {
                                questionIndex: 0,
                                answer: {
                                    type: "single_answer_choice",
                                    response: "Hacked",
                                },
                            },
                        ],
                    }),
            );
        });

        it("should deny changing userId in update", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaireResponses").doc(responseId).update({
                    userId: "different_user",
                }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should deny students from deleting responses", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                        }),
                    );
            });

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .delete(),
            );
        });

        it("should allow instructors to delete responses in their course", async () => {
            const responseId = "response123";
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const instructorId = "instructor789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(instructorId)
                    .set({
                        userId: instructorId,
                        email: "instructor@example.com",
                        role: "instructor",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs.collection("questionnaires").doc(questionnaireId).set({
                    id: questionnaireId,
                    courseId: courseId,
                    topicId: null,
                    title: "Test Questionnaire",
                    questions: [],
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: instructorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            questionnaireId: questionnaireId,
                            userId: "student456",
                            courseId: courseId,
                        }),
                    );
            });

            await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .delete(),
            );
        });
    });

    describe("Response Types Validation", () => {
        it("should allow single choice response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "single_answer_choice",
                                        response: "Option A",
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow multiple choice response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "multiple_answer_choice",
                                        response: ["Option A", "Option B"],
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow short answer response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "short_answer",
                                        response: "This is my answer",
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow slider response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "slider_answer",
                                        response: 7,
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow mixed response types", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "single_answer_choice",
                                        response: "Option A",
                                    },
                                },
                                {
                                    questionIndex: 1,
                                    answer: {
                                        type: "multiple_answer_choice",
                                        response: ["Option B", "Option C"],
                                    },
                                },
                                {
                                    questionIndex: 2,
                                    answer: {
                                        type: "short_answer",
                                        response: "My detailed answer",
                                    },
                                },
                                {
                                    questionIndex: 3,
                                    answer: {
                                        type: "slider_answer",
                                        response: 8,
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should deny response with missing answer.type", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        // Missing type field
                                        response: "Option A",
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should deny response with missing answer.response", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "single_answer_choice",
                                        // Missing response field
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should deny response with wrong primitive type", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "slider_answer",
                                        response: "not a number", // Should be number
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should deny response with nested object instead of scalar", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "single_answer_choice",
                                        response: { nested: "object" }, // Should be string
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should deny response with missing questionIndex", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    // Missing questionIndex
                                    answer: {
                                        type: "single_answer_choice",
                                        response: "Option A",
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should deny response with non-scalar values in array", async () => {
            const responseId = "response123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await assertFails(
                db
                    .collection("questionnaireResponses")
                    .doc(responseId)
                    .set(
                        createResponseData({
                            userId: studentId,
                            responses: [
                                {
                                    questionIndex: 0,
                                    answer: {
                                        type: "multiple_answer_choice",
                                        response: [
                                            "Option A",
                                            { bad: "object" },
                                        ], // Array should only contain scalars
                                    },
                                },
                            ],
                        }),
                    ),
            );
        });
    });
});
