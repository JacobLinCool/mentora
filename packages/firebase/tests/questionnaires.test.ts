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

/** Helper to create a valid questionnaire document */
function createQuestionnaireData(overrides: Record<string, unknown> = {}) {
    return {
        id: "questionnaire123",
        courseId: null,
        topicId: null,
        title: "Test Questionnaire",
        questions: [
            {
                question: {
                    type: "single_answer_choice",
                    questionText: "What is your favorite color?",
                    options: ["Red", "Blue", "Green"],
                },
                required: true,
            },
        ],
        responses: null,
        startAt: Date.now(),
        dueAt: null,
        allowLate: false,
        allowResubmit: false,
        createdBy: "creator456",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

describe("Questionnaires Security Rules", () => {
    describe("Read Access", () => {
        it("should allow course members to read course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should allow creator to read standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should deny non-members from reading course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const nonMemberId = "nonmember999";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

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
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should deny non-creators from reading standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const otherUserId = "other789";
            const db = testEnv.authenticatedContext(otherUserId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should deny unauthenticated users from reading questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const db = testEnv.unauthenticatedContext().firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(createQuestionnaireData());
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should allow querying questionnaires by courseId for course members", async () => {
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("questionnaires")
                    .doc("q1")
                    .set(
                        createQuestionnaireData({
                            id: "q1",
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            const result = await assertSucceeds(
                db
                    .collection("questionnaires")
                    .where("courseId", "==", courseId)
                    .get(),
            );
            expect(result.size).toBe(1);
        });

        it("should allow querying questionnaires by createdBy for standalone", async () => {
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc("q1")
                    .set(
                        createQuestionnaireData({
                            id: "q1",
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            const result = await assertSucceeds(
                db
                    .collection("questionnaires")
                    .where("createdBy", "==", creatorId)
                    .get(),
            );
            expect(result.size).toBe(1);
        });
    });

    describe("Create Access", () => {
        it("should allow instructors to create course-bound questionnaires", async () => {
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
            });

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: instructorId,
                        }),
                    ),
            );
        });

        it("should allow TAs to create course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const taId = "ta789";
            const db = testEnv.authenticatedContext(taId).firestore();

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
                    .doc(taId)
                    .set({
                        userId: taId,
                        email: "ta@example.com",
                        role: "ta",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: taId,
                        }),
                    ),
            );
        });

        it("should allow course owner to create course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const ownerId = "owner999";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: ownerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: ownerId,
                        }),
                    ),
            );
        });

        it("should allow users to create standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                        }),
                    ),
            );
        });

        it("should deny students from creating course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: studentId,
                        }),
                    ),
            );
        });

        it("should deny creating standalone questionnaires with mismatched createdBy", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: "someoneElse",
                        }),
                    ),
            );
        });

        it("should deny unauthenticated users from creating questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(createQuestionnaireData()),
            );
        });

        it("should deny creating questionnaire with invalid data", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            // Missing required questions field
            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).set({
                    id: questionnaireId,
                    courseId: null,
                    title: "Test",
                    // questions missing
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: userId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating questionnaire with empty questions array", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [],
                        }),
                    ),
            );
        });

        it("should deny creating questionnaire with title too short", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            title: "",
                        }),
                    ),
            );
        });

        it("should deny creating questionnaire with id too short", async () => {
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc("abc")
                    .set(
                        createQuestionnaireData({
                            id: "abc", // less than 6 chars
                            courseId: null,
                            createdBy: userId,
                        }),
                    ),
            );
        });
    });

    describe("Update Access", () => {
        it("should allow instructors to update course-bound questionnaires", async () => {
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
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "originalCreator",
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Updated Questionnaire Title",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow creator to update standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Updated Questionnaire Title",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny students from updating course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Hacked Title",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny non-creators from updating standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const otherUserId = "other789";
            const db = testEnv.authenticatedContext(otherUserId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Hacked Title",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny unauthenticated users from updating questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const db = testEnv.unauthenticatedContext().firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(createQuestionnaireData());
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Updated Title",
                    updatedAt: Date.now(),
                }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should allow instructors to delete course-bound questionnaires", async () => {
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
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "originalCreator",
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });

        it("should allow creator to delete standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });

        it("should deny students from deleting course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });

        it("should deny non-creators from deleting standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const otherUserId = "other789";
            const db = testEnv.authenticatedContext(otherUserId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });

        it("should deny unauthenticated users from deleting questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const db = testEnv.unauthenticatedContext().firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(createQuestionnaireData());
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });
    });

    describe("Question Types Validation", () => {
        it("should allow creating questionnaire with multiple choice question", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [
                                {
                                    question: {
                                        type: "multiple_answer_choice",
                                        questionText: "Select all that apply",
                                        options: ["A", "B", "C", "D"],
                                    },
                                    required: true,
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow creating questionnaire with short answer question", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [
                                {
                                    question: {
                                        type: "short_answer",
                                        questionText:
                                            "Describe your experience",
                                    },
                                    required: false,
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow creating questionnaire with slider question", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [
                                {
                                    question: {
                                        type: "slider_answer",
                                        questionText: "Rate your satisfaction",
                                        minLabel: "Very Unsatisfied",
                                        maxLabel: "Very Satisfied",
                                        minValue: 1,
                                        maxValue: 10,
                                        step: 1,
                                    },
                                    required: true,
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow creating questionnaire with mixed question types", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [
                                {
                                    question: {
                                        type: "single_answer_choice",
                                        questionText: "What is your role?",
                                        options: [
                                            "Student",
                                            "Teacher",
                                            "Admin",
                                        ],
                                    },
                                    required: true,
                                },
                                {
                                    question: {
                                        type: "multiple_answer_choice",
                                        questionText:
                                            "Which topics interest you?",
                                        options: [
                                            "Math",
                                            "Science",
                                            "History",
                                            "Art",
                                        ],
                                    },
                                    required: false,
                                },
                                {
                                    question: {
                                        type: "short_answer",
                                        questionText:
                                            "Any additional comments?",
                                    },
                                    required: false,
                                },
                                {
                                    question: {
                                        type: "slider_answer",
                                        questionText:
                                            "How likely would you recommend us?",
                                        minLabel: "Not at all",
                                        maxLabel: "Definitely",
                                        minValue: 0,
                                        maxValue: 10,
                                        step: 1,
                                    },
                                    required: true,
                                },
                            ],
                        }),
                    ),
            );
        });
    });
});

describe("Questionnaires Security Rules", () => {
    describe("Read Access", () => {
        it("should allow course members to read course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should allow creator to read standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should deny non-members from reading course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const nonMemberId = "nonmember999";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

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
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should deny non-creators from reading standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const otherUserId = "other789";
            const db = testEnv.authenticatedContext(otherUserId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should deny unauthenticated users from reading questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const db = testEnv.unauthenticatedContext().firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(createQuestionnaireData());
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).get(),
            );
        });

        it("should allow querying questionnaires by courseId for course members", async () => {
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("questionnaires")
                    .doc("q1")
                    .set(
                        createQuestionnaireData({
                            id: "q1",
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            const result = await assertSucceeds(
                db
                    .collection("questionnaires")
                    .where("courseId", "==", courseId)
                    .get(),
            );
            expect(result.size).toBe(1);
        });

        it("should allow querying questionnaires by createdBy for standalone", async () => {
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc("q1")
                    .set(
                        createQuestionnaireData({
                            id: "q1",
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            const result = await assertSucceeds(
                db
                    .collection("questionnaires")
                    .where("createdBy", "==", creatorId)
                    .get(),
            );
            expect(result.size).toBe(1);
        });
    });

    describe("Create Access", () => {
        it("should allow instructors to create course-bound questionnaires", async () => {
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
            });

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: instructorId,
                        }),
                    ),
            );
        });

        it("should allow TAs to create course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const taId = "ta789";
            const db = testEnv.authenticatedContext(taId).firestore();

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
                    .doc(taId)
                    .set({
                        userId: taId,
                        email: "ta@example.com",
                        role: "ta",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: taId,
                        }),
                    ),
            );
        });

        it("should allow course owner to create course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const ownerId = "owner999";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: ownerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: ownerId,
                        }),
                    ),
            );
        });

        it("should allow users to create standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                        }),
                    ),
            );
        });

        it("should deny students from creating course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: studentId,
                        }),
                    ),
            );
        });

        it("should deny creating standalone questionnaires with mismatched createdBy", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: "someoneElse",
                        }),
                    ),
            );
        });

        it("should deny unauthenticated users from creating questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(createQuestionnaireData()),
            );
        });

        it("should deny creating questionnaire with invalid data", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            // Missing required questions field
            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).set({
                    id: questionnaireId,
                    courseId: null,
                    title: "Test",
                    // questions missing
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: userId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating questionnaire with empty questions array", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [],
                        }),
                    ),
            );
        });

        it("should deny creating questionnaire with title too short", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            title: "",
                        }),
                    ),
            );
        });

        it("should deny creating questionnaire with id too short", async () => {
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("questionnaires")
                    .doc("abc")
                    .set(
                        createQuestionnaireData({
                            id: "abc", // less than 6 chars
                            courseId: null,
                            createdBy: userId,
                        }),
                    ),
            );
        });
    });

    describe("Update Access", () => {
        it("should allow instructors to update course-bound questionnaires", async () => {
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
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "originalCreator",
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Updated Questionnaire Title",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow creator to update standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Updated Questionnaire Title",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny students from updating course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Hacked Title",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny non-creators from updating standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const otherUserId = "other789";
            const db = testEnv.authenticatedContext(otherUserId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Hacked Title",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny unauthenticated users from updating questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const db = testEnv.unauthenticatedContext().firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(createQuestionnaireData());
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).update({
                    title: "Updated Title",
                    updatedAt: Date.now(),
                }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should allow instructors to delete course-bound questionnaires", async () => {
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
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "originalCreator",
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });

        it("should allow creator to delete standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertSucceeds(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });

        it("should deny students from deleting course-bound questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const courseId = "course456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: courseId,
                            createdBy: "instructor123",
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });

        it("should deny non-creators from deleting standalone questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const creatorId = "creator456";
            const otherUserId = "other789";
            const db = testEnv.authenticatedContext(otherUserId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: creatorId,
                        }),
                    );
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });

        it("should deny unauthenticated users from deleting questionnaires", async () => {
            const questionnaireId = "questionnaire123";
            const db = testEnv.unauthenticatedContext().firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(createQuestionnaireData());
            });

            await assertFails(
                db.collection("questionnaires").doc(questionnaireId).delete(),
            );
        });
    });

    describe("Question Types Validation", () => {
        it("should allow creating questionnaire with multiple choice question", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [
                                {
                                    question: {
                                        type: "multiple_answer_choice",
                                        questionText: "Select all that apply",
                                        options: ["A", "B", "C", "D"],
                                    },
                                    required: true,
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow creating questionnaire with short answer question", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [
                                {
                                    question: {
                                        type: "short_answer",
                                        questionText:
                                            "Describe your experience",
                                    },
                                    required: false,
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow creating questionnaire with slider question", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [
                                {
                                    question: {
                                        type: "slider_answer",
                                        questionText: "Rate your satisfaction",
                                        minLabel: "Very Unsatisfied",
                                        maxLabel: "Very Satisfied",
                                        minValue: 1,
                                        maxValue: 10,
                                        step: 1,
                                    },
                                    required: true,
                                },
                            ],
                        }),
                    ),
            );
        });

        it("should allow creating questionnaire with mixed question types", async () => {
            const questionnaireId = "questionnaire123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("questionnaires")
                    .doc(questionnaireId)
                    .set(
                        createQuestionnaireData({
                            id: questionnaireId,
                            courseId: null,
                            createdBy: userId,
                            questions: [
                                {
                                    question: {
                                        type: "single_answer_choice",
                                        questionText: "What is your role?",
                                        options: [
                                            "Student",
                                            "Teacher",
                                            "Admin",
                                        ],
                                    },
                                    required: true,
                                },
                                {
                                    question: {
                                        type: "multiple_answer_choice",
                                        questionText:
                                            "Which topics interest you?",
                                        options: [
                                            "Math",
                                            "Science",
                                            "History",
                                            "Art",
                                        ],
                                    },
                                    required: false,
                                },
                                {
                                    question: {
                                        type: "short_answer",
                                        questionText:
                                            "Any additional comments?",
                                    },
                                    required: false,
                                },
                                {
                                    question: {
                                        type: "slider_answer",
                                        questionText:
                                            "How likely would you recommend us?",
                                        minLabel: "Not at all",
                                        maxLabel: "Definitely",
                                        minValue: 0,
                                        maxValue: 10,
                                        step: 1,
                                    },
                                    required: true,
                                },
                            ],
                        }),
                    ),
            );
        });
    });
});
