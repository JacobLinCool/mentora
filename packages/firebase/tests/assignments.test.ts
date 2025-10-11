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

describe("Assignments Security Rules", () => {
    describe("Read Access", () => {
        it("should allow class members to read class-bound assignments", async () => {
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
                db.collection("assignments").doc(assignmentId).get(),
            );
        });

        it("should allow creator to read standalone assignments", async () => {
            const assignmentId = "assignment123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("assignments")
                    .doc(assignmentId)
                    .set({
                        id: assignmentId,
                        classId: null,
                        title: "Standalone Assignment",
                        prompt: "Do something",
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).get(),
            );
        });

        it("should deny non-members from reading class-bound assignments", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
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
                    createdBy: "instructor123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(
                db.collection("assignments").doc(assignmentId).get(),
            );
        });

        it("should deny non-creators from reading standalone assignments", async () => {
            const assignmentId = "assignment123";
            const creatorId = "creator456";
            const otherUserId = "other789";
            const db = testEnv.authenticatedContext(otherUserId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("assignments")
                    .doc(assignmentId)
                    .set({
                        id: assignmentId,
                        classId: null,
                        title: "Standalone Assignment",
                        prompt: "Do something",
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertFails(
                db.collection("assignments").doc(assignmentId).get(),
            );
        });
    });

    describe("Create Access", () => {
        it("should allow instructors to create class-bound assignments", async () => {
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
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
                    title: "New Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: instructorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow TAs to create class-bound assignments", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const taId = "ta789";
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
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
                    title: "New Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: taId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow authenticated users to create standalone assignments", async () => {
            const assignmentId = "assignment123";
            const userId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: null,
                    title: "Standalone Assignment",
                    prompt: "Do something",
                    mode: "instant",
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

        it("should deny students from creating class-bound assignments", async () => {
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
            });

            await assertFails(
                db.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    classId: classId,
                    title: "Hacked Assignment",
                    prompt: "Do something",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: studentId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });
    });

    describe("Update Access", () => {
        it("should allow instructors to update class-bound assignments", async () => {
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
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).update({
                    title: "Updated Assignment",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow TAs to update class-bound assignments", async () => {
            const assignmentId = "assignment123";
            const classId = "class456";
            const taId = "ta789";
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
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).update({
                    title: "Updated by TA",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow creators to update standalone assignments", async () => {
            const assignmentId = "assignment123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("assignments")
                    .doc(assignmentId)
                    .set({
                        id: assignmentId,
                        classId: null,
                        title: "Standalone Assignment",
                        prompt: "Do something",
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).update({
                    title: "Updated Standalone",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny students from updating class-bound assignments", async () => {
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
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(
                db.collection("assignments").doc(assignmentId).update({
                    title: "Hacked Assignment",
                }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should allow instructors to delete class-bound assignments", async () => {
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
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).delete(),
            );
        });

        it("should allow creators to delete standalone assignments", async () => {
            const assignmentId = "assignment123";
            const creatorId = "creator456";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("assignments")
                    .doc(assignmentId)
                    .set({
                        id: assignmentId,
                        classId: null,
                        title: "Standalone Assignment",
                        prompt: "Do something",
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).delete(),
            );
        });

        it("should deny students from deleting class-bound assignments", async () => {
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
                    createdBy: "creator123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(
                db.collection("assignments").doc(assignmentId).delete(),
            );
        });
    });
});
