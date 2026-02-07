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

describe("Assignments Security Rules", () => {
    describe("Read Access", () => {
        it("should allow class members to read class-bound assignments", async () => {
            const assignmentId = "assignment123";
            const courseId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
                        courseId: null,
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
            const courseId = "class456";
            const nonMemberId = "nonmember999";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
                        courseId: null,
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

        it("should deny querying assignments collection without specific filters", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            // Querying the entire assignments collection fails because rules require
            // either courseId (for membership check) or createdBy (for ownership check)
            await assertFails(db.collection("assignments").get());
        });

        it("should deny unauthenticated users from querying assignments", async () => {
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(db.collection("assignments").get());
        });

        it("should allow querying empty assignments by courseId for class members", async () => {
            const courseId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                // No assignments created - empty collection
            });

            // Should succeed with empty result when filtering by courseId
            await assertSucceeds(
                db
                    .collection("assignments")
                    .where("courseId", "==", courseId)
                    .get(),
            );
        });

        it("should allow querying assignments by createdBy with actual data", async () => {
            const creatorId = "creator456";
            const assignmentId = "assignment123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("assignments")
                    .doc(assignmentId)
                    .set({
                        id: assignmentId,
                        courseId: null,
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

            // Should succeed when there's actual data
            const result = await assertSucceeds(
                db
                    .collection("assignments")
                    .where("createdBy", "==", creatorId)
                    .get(),
            );
            expect(result.size).toBe(1);
        });

        it("should deny querying assignments by courseId for non-members", async () => {
            const courseId = "class456";
            const nonMemberId = "nonmember999";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                // Non-member has no roster entry
            });

            // Should fail even on empty collection if not a member
            await assertFails(
                db
                    .collection("assignments")
                    .where("courseId", "==", courseId)
                    .get(),
            );
        });

        it("should allow querying assignments with startAt filter and ordering", async () => {
            const courseId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
                    .doc(studentId)
                    .set({
                        userId: studentId,
                        email: "student@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });

                const now = Date.now();
                // Create assignments with different startAt times
                await fs
                    .collection("assignments")
                    .doc("assign1")
                    .set({
                        id: "assign1",
                        courseId: courseId,
                        title: "Future Assignment",
                        prompt: "Do something",
                        mode: "instant",
                        startAt: now + 100000,
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: "instructor123",
                        createdAt: now,
                        updatedAt: now,
                    });
                await fs
                    .collection("assignments")
                    .doc("assign2")
                    .set({
                        id: "assign2",
                        courseId: courseId,
                        title: "Available Assignment",
                        prompt: "Do something",
                        mode: "instant",
                        startAt: now - 10000,
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: "instructor123",
                        createdAt: now,
                        updatedAt: now,
                    });
            });

            // Query for available assignments (startAt <= now)
            const result = await assertSucceeds(
                db
                    .collection("assignments")
                    .where("courseId", "==", courseId)
                    .where("startAt", "<=", Date.now())
                    .orderBy("startAt", "desc")
                    .get(),
            );
            expect(result.size).toBe(1);
            expect(result.docs[0]?.data().title).toBe("Available Assignment");
        });
    });

    describe("Create Access", () => {
        it("should allow instructors to create class-bound assignments", async () => {
            const assignmentId = "assignment123";
            const courseId = "class456";
            const instructorId = "instructor789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
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
            const courseId = "class456";
            const taId = "ta789";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
            });

            await assertSucceeds(
                db.collection("assignments").doc(assignmentId).set({
                    id: assignmentId,
                    courseId: courseId,
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
                    courseId: null,
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
            const courseId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
                    courseId: courseId,
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
            const courseId = "class456";
            const instructorId = "instructor789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
            const courseId = "class456";
            const taId = "ta789";
            const db = testEnv.authenticatedContext(taId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
                        courseId: null,
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
            const courseId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
            const courseId = "class456";
            const instructorId = "instructor789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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
                        courseId: null,
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
            const courseId = "class456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
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

    describe("Data Shape Validation", () => {
        it("should deny creating assignment with id shorter than 6 characters", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertFails(
                db.collection("assignments").doc("short").set({
                    id: "short",
                    courseId: null,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: creatorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow creating assignment with id at 6 character minimum", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertSucceeds(
                db.collection("assignments").doc("assign").set({
                    id: "assign",
                    courseId: null,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: creatorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating assignment with id exceeding 128 characters", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();
            const longId = "a".repeat(129);

            await assertFails(
                db.collection("assignments").doc(longId).set({
                    id: longId,
                    courseId: null,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: creatorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating assignment with empty title", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertFails(
                db.collection("assignments").doc("assignment123").set({
                    id: "assignment123",
                    courseId: null,
                    title: "",
                    prompt: "Do the work",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: creatorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating assignment with title exceeding 300 characters", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertFails(
                db
                    .collection("assignments")
                    .doc("assignment123")
                    .set({
                        id: "assignment123",
                        courseId: null,
                        title: "a".repeat(301),
                        prompt: "Do the work",
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating assignment with title at 300 character limit", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc("assignment123")
                    .set({
                        id: "assignment123",
                        courseId: null,
                        title: "a".repeat(300),
                        prompt: "Do the work",
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating assignment with empty prompt", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertFails(
                db.collection("assignments").doc("assignment123").set({
                    id: "assignment123",
                    courseId: null,
                    title: "Test Assignment",
                    prompt: "",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: creatorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating assignment with prompt exceeding 50000 characters", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertFails(
                db
                    .collection("assignments")
                    .doc("assignment123")
                    .set({
                        id: "assignment123",
                        courseId: null,
                        title: "Test Assignment",
                        prompt: "a".repeat(50001),
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating assignment with prompt at 50000 character limit", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc("assignment123")
                    .set({
                        id: "assignment123",
                        courseId: null,
                        title: "Test Assignment",
                        prompt: "a".repeat(50000),
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating assignment with invalid mode", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertFails(
                db.collection("assignments").doc("assignment123").set({
                    id: "assignment123",
                    courseId: null,
                    title: "Test Assignment",
                    prompt: "Do the work",
                    mode: "invalid",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: creatorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });
    });

    describe("Question and Prompt Fields", () => {
        it("should allow creating assignment with both question and prompt", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertSucceeds(
                db
                    .collection("assignments")
                    .doc("assignment_with_question")
                    .set({
                        id: "assignment_with_question",
                        courseId: null,
                        title: "Test Assignment with Question",
                        question: "What is democracy?",
                        prompt: "Democracy is a form of government... (detailed content generated by AI)",
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating assignment with only prompt (question is null)", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            await assertSucceeds(
                db.collection("assignments").doc("assignment_prompt_only").set({
                    id: "assignment_prompt_only",
                    courseId: null,
                    title: "Test Assignment Prompt Only",
                    question: null,
                    prompt: "Legacy assignment with only prompt",
                    mode: "instant",
                    startAt: Date.now(),
                    dueAt: null,
                    allowLate: false,
                    allowResubmit: false,
                    createdBy: creatorId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should enforce question max length of 2000 characters", async () => {
            const creatorId = "creator123";
            const db = testEnv.authenticatedContext(creatorId).firestore();

            const longQuestion = "a".repeat(2001);

            await assertFails(
                db
                    .collection("assignments")
                    .doc("assignment_long_question")
                    .set({
                        id: "assignment_long_question",
                        courseId: null,
                        title: "Test Assignment",
                        question: longQuestion,
                        prompt: "Some prompt",
                        mode: "instant",
                        startAt: Date.now(),
                        dueAt: null,
                        allowLate: false,
                        allowResubmit: false,
                        createdBy: creatorId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });
    });
});
