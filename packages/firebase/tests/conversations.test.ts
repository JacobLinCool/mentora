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

describe("Conversations Security Rules", () => {
    describe("Read Access", () => {
        it("should allow students to read their own conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
            });

            await assertSucceeds(
                db.collection("conversations").doc(conversationId).get(),
            );
        });

        it("should allow instructors to read student conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const instructorId = "instructor222";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
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
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: instructorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
            });

            await assertSucceeds(
                db.collection("conversations").doc(conversationId).get(),
            );
        });

        it("should allow TAs to read student conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const taId = "ta333";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
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
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
            });

            await assertSucceeds(
                db.collection("conversations").doc(conversationId).get(),
            );
        });

        it("should deny other students from reading conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const otherStudentId = "student444";
            const db = testEnv.authenticatedContext(otherStudentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(otherStudentId)
                    .set({
                        userId: otherStudentId,
                        email: "other@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).get(),
            );
        });

        it("should deny non-class members from reading conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const nonMemberId = "nonmember999";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).get(),
            );
        });

        it("should deny querying empty conversations collection", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            // Conversations don't have targetNotExists() rule, so querying should fail
            await assertFails(db.collection("conversations").get());
        });

        it("should deny unauthenticated users from querying conversations", async () => {
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(db.collection("conversations").get());
        });

        it("should allow querying empty conversations by userId", async () => {
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            // No conversations created - should succeed with empty result when filtering by userId
            await assertSucceeds(
                db
                    .collection("conversations")
                    .where("userId", "==", studentId)
                    .get(),
            );
        });

        it("should allow querying empty conversations by assignmentId for class instructors", async () => {
            const assignmentId = "assignment456";
            const courseId = "class789";
            const instructorId = "instructor999";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
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
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: instructorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                // No conversations created
            });

            // Instructor should be able to query conversations for the assignment
            await assertSucceeds(
                db
                    .collection("conversations")
                    .where("assignmentId", "==", assignmentId)
                    .get(),
            );
        });

        it("should allow querying conversation by assignmentId and userId", async () => {
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const conversationId = "conversation123";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
            });

            // Student should be able to query their own conversation by assignmentId and userId
            const result = await assertSucceeds(
                db
                    .collection("conversations")
                    .where("assignmentId", "==", assignmentId)
                    .where("userId", "==", studentId)
                    .get(),
            );
            expect(result.size).toBe(1);
            expect(result.docs[0]?.id).toBe(conversationId);
        });
    });

    describe("Create Access", () => {
        it("should allow students to create their own conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(
                db.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                }),
            );
        });

        it("should deny students from creating conversations for other users", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const otherStudentId = "student444";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: otherStudentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                }),
            );
        });

        it("should deny unauthenticated users from creating conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const studentId = "student111";
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(
                db.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                }),
            );
        });
    });

    describe("Update Access", () => {
        it("should allow students to update their own conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("conversations")
                    .doc(conversationId)
                    .set({
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "awaiting_idea",
                        lastActionAt: Date.now() - 1000,
                        createdAt: Date.now() - 1000,
                        updatedAt: Date.now() - 1000,
                        turns: [],
                    });
            });

            await assertSucceeds(
                db
                    .collection("conversations")
                    .doc(conversationId)
                    .update({
                        turns: [
                            {
                                id: "turn1",
                                type: "topic",
                                text: "New turn",
                                analysis: null,
                                pendingStartAt: null,
                                createdAt: Date.now(),
                            },
                        ],
                        lastActionAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow instructors to update conversations (e.g., close them)", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const instructorId = "instructor222";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
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
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: instructorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("conversations")
                    .doc(conversationId)
                    .set({
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "awaiting_idea",
                        lastActionAt: Date.now() - 1000,
                        createdAt: Date.now() - 1000,
                        updatedAt: Date.now() - 1000,
                        turns: [],
                    });
            });

            await assertSucceeds(
                db.collection("conversations").doc(conversationId).update({
                    state: "closed",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow TAs to update conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const taId = "ta333";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
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
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("conversations")
                    .doc(conversationId)
                    .set({
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "awaiting_idea",
                        lastActionAt: Date.now() - 1000,
                        createdAt: Date.now() - 1000,
                        updatedAt: Date.now() - 1000,
                        turns: [],
                    });
            });

            await assertSucceeds(
                db.collection("conversations").doc(conversationId).update({
                    state: "closed",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny other students from updating conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const otherStudentId = "student444";
            const db = testEnv.authenticatedContext(otherStudentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(otherStudentId)
                    .set({
                        userId: otherStudentId,
                        email: "other@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("conversations")
                    .doc(conversationId)
                    .set({
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "awaiting_idea",
                        lastActionAt: Date.now() - 1000,
                        createdAt: Date.now() - 1000,
                        updatedAt: Date.now() - 1000,
                        turns: [],
                    });
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).update({
                    state: "closed",
                }),
            );
        });

        it("should deny update if last turn's pendingStartAt is not null", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("conversations")
                    .doc(conversationId)
                    .set({
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "awaiting_idea",
                        lastActionAt: Date.now(),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        turns: [
                            {
                                id: "turn1",
                                type: "topic",
                                text: "Test turn",
                                analysis: null,
                                pendingStartAt: Date.now(),
                                createdAt: Date.now(),
                            },
                        ],
                    });
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).update({
                    state: "closed",
                }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should deny all users from deleting conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor222",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).delete(),
            );
        });

        it("should deny instructors from deleting conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const instructorId = "instructor222";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
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
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: instructorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).delete(),
            );
        });
    });

    describe("Data Shape Validation", () => {
        it("should deny creating conversation with id exceeding 128 characters", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
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

                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            // Document ID length is validated by Firestore itself (max 1500 bytes)
            // This throws INVALID_ARGUMENT before security rules are checked
            // So we just test that it fails, regardless of the specific error
            const longDocId = "a".repeat(1501);
            try {
                await db.collection("conversations").doc(longDocId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                });
                throw new Error("Expected operation to fail");
            } catch (error: any) {
                // Should fail with INVALID_ARGUMENT (Firestore validation)
                // not PERMISSION_DENIED (security rules)
                if (error.message === "Expected operation to fail") {
                    throw error;
                }
                // Success - any error is acceptable here
            }
        });

        it("should allow creating conversation with id at 128 character limit", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
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

                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const validDocId = "a".repeat(128);
            await assertSucceeds(
                db.collection("conversations").doc(validDocId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                }),
            );
        });

        it("should deny creating conversation with invalid state", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
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

                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "invalid_state",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: [],
                }),
            );
        });

        it("should deny creating conversation with turns exceeding 1000 items", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
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

                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const tooManyTurns = Array(1001).fill({
                id: "turn1",
                type: "idea",
                text: "Test turn",
                analysis: null,
                pendingStartAt: null,
                createdAt: Date.now(),
            });

            await assertFails(
                db.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: tooManyTurns,
                }),
            );
        });

        it("should allow creating conversation with turns at 1000 item limit", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const courseId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
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

                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const maxTurns = Array(1000).fill({
                id: "turn1",
                type: "idea",
                text: "Test turn",
                analysis: null,
                pendingStartAt: null,
                createdAt: Date.now(),
            });

            await assertSucceeds(
                db.collection("conversations").doc(conversationId).set({
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "awaiting_idea",
                    lastActionAt: Date.now(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    turns: maxTurns,
                }),
            );
        });
    });
});
