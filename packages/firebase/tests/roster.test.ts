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

describe("Course Roster Security Rules", () => {
    describe("Read Access", () => {
        it("should allow members to read their own roster entry", async () => {
            const courseId = "course123";
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner456",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(userId)
                    .set({
                        userId: userId,
                        email: "user@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            await assertSucceeds(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(userId)
                    .get(),
            );
        });

        it("should allow course members to read entire roster", async () => {
            const courseId = "course123";
            const userId = "user123";
            const otherUserId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner789",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(userId)
                    .set({
                        userId: userId,
                        email: "user@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(otherUserId)
                    .set({
                        userId: otherUserId,
                        email: "other@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            await assertSucceeds(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(otherUserId)
                    .get(),
            );
        });

        it("should deny non-members from reading roster", async () => {
            const courseId = "course123";
            const userId = "user123";
            const nonMemberId = "nonmember999";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner456",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(userId)
                    .set({
                        userId: userId,
                        email: "user@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            await assertFails(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(userId)
                    .get(),
            );
        });

        it("should allow querying roster collection group for own entries", async () => {
            const userId = "user123";
            const courseId1 = "course456";
            const courseId2 = "course789";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                // Create two courses with user as member
                await fs.collection("courses").doc(courseId1).set({
                    id: courseId1,
                    title: "First Course",
                    code: "ABC123",
                    ownerId: "owner999",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId1)
                    .collection("roster")
                    .doc(userId)
                    .set({
                        userId: userId,
                        email: "user@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now() - 10000,
                    });

                await fs.collection("courses").doc(courseId2).set({
                    id: courseId2,
                    title: "Second Course",
                    code: "XYZ789",
                    ownerId: "owner888",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("courses")
                    .doc(courseId2)
                    .collection("roster")
                    .doc(userId)
                    .set({
                        userId: userId,
                        email: "user@example.com",
                        role: "ta",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            // User should be able to query their own roster entries across all courses
            const result = await assertSucceeds(
                db
                    .collectionGroup("roster")
                    .where("userId", "==", userId)
                    .get(),
            );
            expect(result.size).toBe(2);
        });

        it("should deny querying roster collection group for other users' entries", async () => {
            const userId = "user123";
            const otherUserId = "user456";
            const courseId = "course789";
            const db = testEnv.authenticatedContext(userId).firestore();

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
                    .doc(otherUserId)
                    .set({
                        userId: otherUserId,
                        email: "other@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            // User should NOT be able to query other users' roster entries
            await assertFails(
                db
                    .collectionGroup("roster")
                    .where("userId", "==", otherUserId)
                    .get(),
            );
        });
    });

    describe("Create Access", () => {
        it("should allow instructors to add roster entries", async () => {
            const courseId = "course123";
            const instructorId = "instructor123";
            const newMemberId = "newmember456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner789",
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
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(newMemberId)
                    .set({
                        userId: newMemberId,
                        email: "newmember@example.com",
                        role: "student",
                        status: "invited",
                        joinedAt: null,
                    }),
            );
        });
        it("should allow instructors to add an auditor to roster", async () => {
            const courseId = "course123";
            const instructorId = "instructor123";
            const auditorId = "auditor123";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: instructorId,
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
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(auditorId)
                    .set({
                        userId: auditorId,
                        email: "auditor@example.com",
                        role: "auditor",
                        status: "active",
                        joinedAt: Date.now(),
                    }),
            );
        });

        it("should allow course owner to add roster entries", async () => {
            const courseId = "course123";
            const ownerId = "owner456";
            const newMemberId = "newmember789";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("courses")
                    .doc(courseId)
                    .set({
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
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(newMemberId)
                    .set({
                        userId: newMemberId,
                        email: "newmember@example.com",
                        role: "student",
                        status: "invited",
                        joinedAt: null,
                    }),
            );
        });

        it("should deny students from adding roster entries", async () => {
            const courseId = "course123";
            const studentId = "student123";
            const newMemberId = "newmember456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner789",
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
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(newMemberId)
                    .set({
                        userId: newMemberId,
                        email: "newmember@example.com",
                        role: "student",
                        status: "invited",
                        joinedAt: null,
                    }),
            );
        });

        it("should deny non-members from adding roster entries", async () => {
            const courseId = "course123";
            const nonMemberId = "nonmember999";
            const newMemberId = "newmember456";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("courses")
                    .doc(courseId)
                    .set({
                        id: courseId,
                        title: "Test Course",
                        code: "ABC123",
                        ownerId: "owner789",
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertFails(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(newMemberId)
                    .set({
                        userId: newMemberId,
                        email: "newmember@example.com",
                        role: "student",
                        status: "invited",
                        joinedAt: null,
                    }),
            );
        });
    });

    describe("Update Access", () => {
        it("should allow instructors to update roster entries", async () => {
            const courseId = "course123";
            const instructorId = "instructor123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner789",
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

            await assertSucceeds(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(studentId)
                    .update({
                        role: "ta",
                    }),
            );
        });

        it("should allow course owner to update roster entries", async () => {
            const courseId = "course123";
            const ownerId = "owner456";
            const studentId = "student789";
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

            await assertSucceeds(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(studentId)
                    .update({
                        status: "removed",
                    }),
            );
        });

        it("should deny students from updating roster entries", async () => {
            const courseId = "course123";
            const studentId = "student123";
            const otherStudentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner789",
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
            });

            await assertFails(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(otherStudentId)
                    .update({
                        role: "instructor",
                    }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should allow instructors to delete roster entries", async () => {
            const courseId = "course123";
            const instructorId = "instructor123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner789",
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

            await assertSucceeds(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(studentId)
                    .delete(),
            );
        });

        it("should allow course owner to delete roster entries", async () => {
            const courseId = "course123";
            const ownerId = "owner456";
            const studentId = "student789";
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

            await assertSucceeds(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(studentId)
                    .delete(),
            );
        });

        it("should deny students from deleting roster entries", async () => {
            const courseId = "course123";
            const studentId = "student123";
            const otherStudentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "ABC123",
                    ownerId: "owner789",
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
            });

            await assertFails(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(otherStudentId)
                    .delete(),
            );
        });
    });

    describe("Data Shape Validation", () => {
        it("should deny creating roster entry with userId exceeding 128 characters", async () => {
            const courseId = "course123";
            const instructorId = "instructor456";
            const newUserId = "newuser789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "TEST123",
                    ownerId: "owner123",
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

            await assertFails(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(newUserId)
                    .set({
                        userId: "a".repeat(129),
                        email: "newuser@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating roster entry with email exceeding 320 characters", async () => {
            const courseId = "course123";
            const instructorId = "instructor456";
            const newUserId = "newuser789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "TEST123",
                    ownerId: "owner123",
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

            await assertFails(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(newUserId)
                    .set({
                        userId: newUserId,
                        email: "a".repeat(321),
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating roster entry with invalid role", async () => {
            const courseId = "course123";
            const instructorId = "instructor456";
            const newUserId = "newuser789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "TEST123",
                    ownerId: "owner123",
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

            await assertFails(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(newUserId)
                    .set({
                        userId: newUserId,
                        email: "newuser@example.com",
                        role: "invalid_role",
                        status: "active",
                        joinedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating roster entry with invalid status", async () => {
            const courseId = "course123";
            const instructorId = "instructor456";
            const newUserId = "newuser789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "TEST123",
                    ownerId: "owner123",
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

            await assertFails(
                db
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(newUserId)
                    .set({
                        userId: newUserId,
                        email: "newuser@example.com",
                        role: "student",
                        status: "invalid_status",
                        joinedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating roster entry with null userId for invites", async () => {
            const courseId = "course123";
            const instructorId = "instructor456";
            const inviteId = "invite789";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("courses").doc(courseId).set({
                    id: courseId,
                    title: "Test Course",
                    code: "TEST123",
                    ownerId: "owner123",
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
                    .collection("courses")
                    .doc(courseId)
                    .collection("roster")
                    .doc(inviteId)
                    .set({
                        userId: null,
                        email: "invited@example.com",
                        role: "student",
                        status: "invited",
                        joinedAt: null,
                    }),
            );
        });
    });
});
