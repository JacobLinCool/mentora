import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
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
            const classId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
            const classId = "class789";
            const instructorId = "instructor222";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
            const classId = "class789";
            const taId = "ta333";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
            const classId = "class789";
            const studentId = "student111";
            const otherStudentId = "student444";
            const db = testEnv.authenticatedContext(otherStudentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
            const classId = "class789";
            const studentId = "student111";
            const nonMemberId = "nonmember999";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
    });

    describe("Create Access", () => {
        it("should allow students to create their own conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const classId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
            const classId = "class789";
            const studentId = "student111";
            const otherStudentId = "student444";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: otherStudentId,
                    state: "in_progress",
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
            const classId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
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
                        id: conversationId,
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "in_progress",
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
            const classId = "class789";
            const instructorId = "instructor222";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                        id: conversationId,
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "in_progress",
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
            const classId = "class789";
            const taId = "ta333";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                        id: conversationId,
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "in_progress",
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
            const classId = "class789";
            const studentId = "student111";
            const otherStudentId = "student444";
            const db = testEnv.authenticatedContext(otherStudentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                        id: conversationId,
                        assignmentId: assignmentId,
                        userId: studentId,
                        state: "in_progress",
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
    });

    describe("Delete Access", () => {
        it("should deny all users from deleting conversations", async () => {
            const conversationId = "conversation123";
            const assignmentId = "assignment456";
            const classId = "class789";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
            const classId = "class789";
            const instructorId = "instructor222";
            const studentId = "student111";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                    id: conversationId,
                    assignmentId: assignmentId,
                    userId: studentId,
                    state: "in_progress",
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
});
