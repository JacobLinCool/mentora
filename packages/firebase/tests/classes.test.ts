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

describe("Classes Security Rules", () => {
    describe("Read Access", () => {
        it("should allow class members to read the class", async () => {
            const classId = "class123";
            const userId = "user123";
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(userId).firestore();

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
                    .doc(userId)
                    .set({
                        userId: userId,
                        email: "user@example.com",
                        role: "student",
                        status: "active",
                        joinedAt: Date.now(),
                    });
            });

            await assertSucceeds(db.collection("classes").doc(classId).get());
        });

        it("should allow class owner to read the class", async () => {
            const classId = "class123";
            const ownerId = "owner456";
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

            await assertSucceeds(db.collection("classes").doc(classId).get());
        });

        it("should deny non-members from reading the class", async () => {
            const classId = "class123";
            const userId = "user123";
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(userId).firestore();

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

            await assertFails(db.collection("classes").doc(classId).get());
        });

        it("should deny unauthenticated users from reading classes", async () => {
            const classId = "class123";
            const db = testEnv.unauthenticatedContext().firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("classes")
                    .doc(classId)
                    .set({
                        id: classId,
                        title: "Test Class",
                        code: "ABC123",
                        ownerId: "owner456",
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertFails(db.collection("classes").doc(classId).get());
        });

        it("should deny querying classes collection without specific filters", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            // Querying the entire classes collection fails because rules require
            // either class membership or ownership check which needs document data
            await assertFails(db.collection("classes").get());
        });

        it("should deny unauthenticated users from querying classes", async () => {
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(db.collection("classes").get());
        });

        it("should allow querying empty classes by ownerId", async () => {
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            // No classes created - should succeed with empty result when filtering by owner
            await assertSucceeds(
                db.collection("classes").where("ownerId", "==", ownerId).get(),
            );
        });

        it("should allow querying classes by ownerId with ordering", async () => {
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                const fs = context.firestore();
                const now = Date.now();
                await fs
                    .collection("classes")
                    .doc("class1")
                    .set({
                        id: "class1",
                        title: "Older Class",
                        code: "OLD123",
                        ownerId: ownerId,
                        createdAt: now - 10000,
                        updatedAt: now - 10000,
                    });
                await fs.collection("classes").doc("class2").set({
                    id: "class2",
                    title: "Newer Class",
                    code: "NEW456",
                    ownerId: ownerId,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            // Should succeed with ordered results
            const result = await assertSucceeds(
                db
                    .collection("classes")
                    .where("ownerId", "==", ownerId)
                    .orderBy("createdAt", "desc")
                    .get(),
            );
            expect(result.size).toBe(2);
            expect(result.docs[0]?.data().title).toBe("Newer Class");
        });
    });

    describe("Create Access", () => {
        it("should allow authenticated users to create a class", async () => {
            const classId = "class123";
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db.collection("classes").doc(classId).set({
                    id: classId,
                    title: "New Class",
                    code: "XYZ789",
                    ownerId: userId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny unauthenticated users from creating classes", async () => {
            const classId = "class123";
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(
                db.collection("classes").doc(classId).set({
                    id: classId,
                    title: "New Class",
                    code: "XYZ789",
                    ownerId: "user123",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });
    });

    describe("Update Access", () => {
        it("should allow class owner to update the class", async () => {
            const classId = "class123";
            const ownerId = "owner456";
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
                db.collection("classes").doc(classId).update({
                    title: "Updated Class",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow instructors in roster to update the class", async () => {
            const classId = "class123";
            const instructorId = "instructor789";
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

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
                db.collection("classes").doc(classId).update({
                    title: "Updated by Instructor",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny students from updating the class", async () => {
            const classId = "class123";
            const studentId = "student123";
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(studentId).firestore();

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

            await assertFails(
                db.collection("classes").doc(classId).update({
                    title: "Hacked Class",
                }),
            );
        });

        it("should deny non-members from updating the class", async () => {
            const classId = "class123";
            const userId = "user123";
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(userId).firestore();

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

            await assertFails(
                db.collection("classes").doc(classId).update({
                    title: "Hacked Class",
                }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should allow class owner to delete the class", async () => {
            const classId = "class123";
            const ownerId = "owner456";
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
                db.collection("classes").doc(classId).delete(),
            );
        });

        it("should allow instructors in roster to delete the class", async () => {
            const classId = "class123";
            const instructorId = "instructor789";
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(instructorId).firestore();

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
                db.collection("classes").doc(classId).delete(),
            );
        });

        it("should deny students from deleting the class", async () => {
            const classId = "class123";
            const studentId = "student123";
            const ownerId = "owner456";
            const db = testEnv.authenticatedContext(studentId).firestore();

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

            await assertFails(db.collection("classes").doc(classId).delete());
        });
    });

    describe("Data Shape Validation", () => {
        it("should deny creating class with id shorter than 6 characters", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await assertFails(
                db.collection("classes").doc("short").set({
                    id: "short",
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: ownerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should allow creating class with id at 6 character minimum", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await assertSucceeds(
                db.collection("classes").doc("class1").set({
                    id: "class1",
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: ownerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating class with id exceeding 128 characters", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();
            const longId = "a".repeat(129);

            await assertFails(
                db.collection("classes").doc(longId).set({
                    id: longId,
                    title: "Test Class",
                    code: "ABC123",
                    ownerId: ownerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating class with empty title", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await assertFails(
                db.collection("classes").doc("class123").set({
                    id: "class123",
                    title: "",
                    code: "ABC123",
                    ownerId: ownerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating class with title exceeding 200 characters", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await assertFails(
                db
                    .collection("classes")
                    .doc("class123")
                    .set({
                        id: "class123",
                        title: "a".repeat(201),
                        code: "ABC123",
                        ownerId: ownerId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating class with title at 200 character limit", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await assertSucceeds(
                db
                    .collection("classes")
                    .doc("class123")
                    .set({
                        id: "class123",
                        title: "a".repeat(200),
                        code: "ABC123",
                        ownerId: ownerId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating class with empty code", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await assertFails(
                db.collection("classes").doc("class123").set({
                    id: "class123",
                    title: "Test Class",
                    code: "",
                    ownerId: ownerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating class with code exceeding 64 characters", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await assertFails(
                db
                    .collection("classes")
                    .doc("class123")
                    .set({
                        id: "class123",
                        title: "Test Class",
                        code: "a".repeat(65),
                        ownerId: ownerId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating class with code at 32 character limit", async () => {
            const ownerId = "owner123";
            const db = testEnv.authenticatedContext(ownerId).firestore();

            await assertSucceeds(
                db
                    .collection("classes")
                    .doc("class123")
                    .set({
                        id: "class123",
                        title: "Test Class",
                        code: "a".repeat(32),
                        ownerId: ownerId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });
    });
});
