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

describe("Submissions Security Rules", () => {
    describe("Read Access", () => {
        it("should allow students to read their own submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "in_progress",
                        startedAt: Date.now(),
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .get(),
            );
        });

        it("should allow instructors to read all submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const instructorId = "instructor789";
            const studentId = "student999";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner111",
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
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "submitted",
                        startedAt: Date.now() - 1000,
                        submittedAt: Date.now(),
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .get(),
            );
        });

        it("should allow TAs to read all submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const taId = "ta789";
            const studentId = "student999";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner111",
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
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "submitted",
                        startedAt: Date.now() - 1000,
                        submittedAt: Date.now(),
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .get(),
            );
        });

        it("should deny students from reading other students' submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
            const otherStudentId = "student999";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner111",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(otherStudentId)
                    .set({
                        userId: otherStudentId,
                        state: "submitted",
                        startedAt: Date.now() - 1000,
                        submittedAt: Date.now(),
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertFails(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(otherStudentId)
                    .get(),
            );
        });

        it("should allow students to query their own empty submissions subcollection", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                // No submissions created - empty subcollection
            });

            // Student querying their own submission (non-existent) should succeed
            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .get(),
            );
        });

        it("should allow instructors to query empty submissions subcollection", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const instructorId = "instructor789";
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
                // No submissions created
            });

            // Instructor should be able to query submissions collection (even if empty)
            const result = await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .get(),
            );
            // Verify it's actually empty
            expect(result.size).toBe(0);
        });

        it("should allow instructors to query submissions with state filter and ordering", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const instructorId = "instructor789";
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

                const now = Date.now();
                // Create submissions with different states and times
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc("student1")
                    .set({
                        userId: "student1",
                        state: "in_progress",
                        startedAt: now - 20000,
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc("student2")
                    .set({
                        userId: "student2",
                        state: "submitted",
                        startedAt: now - 10000,
                        submittedAt: now - 5000,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc("student3")
                    .set({
                        userId: "student3",
                        state: "submitted",
                        startedAt: now - 15000,
                        submittedAt: now - 8000,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            // Query for submitted submissions ordered by startedAt
            const result = await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .where("state", "==", "submitted")
                    .orderBy("startedAt", "desc")
                    .get(),
            );
            expect(result.size).toBe(2);
            expect(result.docs[0]?.data().userId).toBe("student2");
        });
    });

    describe("Create Access", () => {
        it("should allow students to create their own submission in in_progress state", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "in_progress",
                        startedAt: Date.now(),
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    }),
            );
        });

        it("should deny students from creating submission in submitted state", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "submitted",
                        startedAt: Date.now() - 1000,
                        submittedAt: Date.now(),
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    }),
            );
        });

        it("should deny students from creating submissions for other students", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
            const otherStudentId = "student999";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(otherStudentId)
                    .set({
                        userId: otherStudentId,
                        state: "in_progress",
                        startedAt: Date.now(),
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    }),
            );
        });
    });

    describe("Update Access - Students", () => {
        it("should allow students to update their in_progress submission", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "in_progress",
                        startedAt: Date.now() - 1000,
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .update({
                        state: "in_progress",
                    }),
            );
        });

        it("should allow students to submit their in_progress submission", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "in_progress",
                        startedAt: Date.now() - 1000,
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .update({
                        state: "submitted",
                        submittedAt: Date.now(),
                    }),
            );
        });

        it("should deny students from changing state of submitted submission", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "submitted",
                        startedAt: Date.now() - 2000,
                        submittedAt: Date.now() - 1000,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertFails(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .update({
                        state: "in_progress",
                    }),
            );
        });
    });

    describe("Update Access - Instructors/TAs", () => {
        it("should allow instructors to grade submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const instructorId = "instructor789";
            const studentId = "student999";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner111",
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
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "submitted",
                        startedAt: Date.now() - 2000,
                        submittedAt: Date.now() - 1000,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .update({
                        state: "graded_complete",
                        scoreCompletion: 100,
                        notes: "Great work!",
                    }),
            );
        });

        it("should allow TAs to grade submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const taId = "ta789";
            const studentId = "student999";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner111",
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
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "submitted",
                        startedAt: Date.now() - 2000,
                        submittedAt: Date.now() - 1000,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .update({
                        state: "graded_complete",
                        scoreCompletion: 95,
                        notes: "Good job!",
                    }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should allow instructors to delete submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const instructorId = "instructor789";
            const studentId = "student999";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner111",
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
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "submitted",
                        startedAt: Date.now() - 2000,
                        submittedAt: Date.now() - 1000,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .delete(),
            );
        });

        it("should deny students from deleting submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
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
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
                    title: "Test Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "in_progress",
                        startedAt: Date.now() - 1000,
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertFails(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .delete(),
            );
        });

        it("should deny TAs from deleting submissions", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const taId = "ta789";
            const studentId = "student999";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner111",
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
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "submitted",
                        startedAt: Date.now() - 2000,
                        submittedAt: Date.now() - 1000,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    });
            });

            await assertFails(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .delete(),
            );
        });
    });

    describe("Data Shape Validation", () => {
        it("should deny creating submission with userId exceeding 128 characters", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: "a".repeat(129),
                        state: "in_progress",
                        startedAt: Date.now(),
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    }),
            );
        });

        it("should deny creating submission with invalid state", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "invalid_state",
                        startedAt: Date.now(),
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    }),
            );
        });

        it("should deny creating submission with notes exceeding 10000 characters", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "in_progress",
                        startedAt: Date.now(),
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: "a".repeat(10001),
                    }),
            );
        });

        it("should allow creating submission with notes at 10000 character limit", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "TEST123",
                    ownerId: "owner123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await fs
                    .collection("classes")
                    .doc(classId)
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
                    classId: classId,
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

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc(assignmentId)
                    .collection("submissions")
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        state: "in_progress",
                        startedAt: Date.now(),
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: "a".repeat(10000),
                    }),
            );
        });
    });
});
