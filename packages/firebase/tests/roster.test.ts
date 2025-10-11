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

describe("Class Roster Security Rules", () => {
    describe("Read Access", () => {
        it("should allow members to read their own roster entry", async () => {
            const classId = "class123";
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner456",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    .collection("classes")
                    .doc(classId)
                    .collection("roster")
                    .doc(userId)
                    .get(),
            );
        });

        it("should allow class members to read entire roster", async () => {
            const classId = "class123";
            const userId = "user123";
            const otherUserId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner789",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    .collection("classes")
                    .doc(classId)
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
                    .collection("classes")
                    .doc(classId)
                    .collection("roster")
                    .doc(otherUserId)
                    .get(),
            );
        });

        it("should deny non-members from reading roster", async () => {
            const classId = "class123";
            const userId = "user123";
            const nonMemberId = "nonmember999";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner456",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await fs
                    .collection("classes")
                    .doc(classId)
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
                    .collection("classes")
                    .doc(classId)
                    .collection("roster")
                    .doc(userId)
                    .get(),
            );
        });
    });

    describe("Create Access", () => {
        it("should allow instructors to add roster entries", async () => {
            const classId = "class123";
            const instructorId = "instructor123";
            const newMemberId = "newmember456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner789",
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
                db
                    .collection("classes")
                    .doc(classId)
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

        it("should allow class owner to add roster entries", async () => {
            const classId = "class123";
            const ownerId = "owner456";
            const newMemberId = "newmember789";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("classes")
                    .doc(classId)
                    .set({
                        id: classId,
                        title: "Test Class",
                        code: "ABC123",
                        ownerId: ownerId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertSucceeds(
                db
                    .collection("classes")
                    .doc(classId)
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
            const classId = "class123";
            const studentId = "student123";
            const newMemberId = "newmember456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner789",
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
                db
                    .collection("classes")
                    .doc(classId)
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
            const classId = "class123";
            const nonMemberId = "nonmember999";
            const newMemberId = "newmember456";
            const db = testEnv.authenticatedContext(nonMemberId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("classes")
                    .doc(classId)
                    .set({
                        id: classId,
                        title: "Test Class",
                        code: "ABC123",
                        ownerId: "owner789",
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertFails(
                db
                    .collection("classes")
                    .doc(classId)
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
            const classId = "class123";
            const instructorId = "instructor123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner789",
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

            await assertSucceeds(
                db
                    .collection("classes")
                    .doc(classId)
                    .collection("roster")
                    .doc(studentId)
                    .update({
                        role: "ta",
                    }),
            );
        });

        it("should allow class owner to update roster entries", async () => {
            const classId = "class123";
            const ownerId = "owner456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: ownerId,
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

            await assertSucceeds(
                db
                    .collection("classes")
                    .doc(classId)
                    .collection("roster")
                    .doc(studentId)
                    .update({
                        status: "removed",
                    }),
            );
        });

        it("should deny students from updating roster entries", async () => {
            const classId = "class123";
            const studentId = "student123";
            const otherStudentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner789",
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
            });

            await assertFails(
                db
                    .collection("classes")
                    .doc(classId)
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
            const classId = "class123";
            const instructorId = "instructor123";
            const studentId = "student456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner789",
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

            await assertSucceeds(
                db
                    .collection("classes")
                    .doc(classId)
                    .collection("roster")
                    .doc(studentId)
                    .delete(),
            );
        });

        it("should allow class owner to delete roster entries", async () => {
            const classId = "class123";
            const ownerId = "owner456";
            const studentId = "student789";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: ownerId,
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

            await assertSucceeds(
                db
                    .collection("classes")
                    .doc(classId)
                    .collection("roster")
                    .doc(studentId)
                    .delete(),
            );
        });

        it("should deny students from deleting roster entries", async () => {
            const classId = "class123";
            const studentId = "student123";
            const otherStudentId = "student456";
            const db = testEnv.authenticatedContext(studentId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                await fs.collection("classes").doc(classId).set({
                    id: classId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: "owner789",
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
            });

            await assertFails(
                db
                    .collection("classes")
                    .doc(classId)
                    .collection("roster")
                    .doc(otherStudentId)
                    .delete(),
            );
        });
    });
});
