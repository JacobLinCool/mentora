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
});
