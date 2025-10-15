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

describe("User Profiles Security Rules", () => {
    describe("Read Access", () => {
        it("should allow users to read their own profile", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context.firestore().collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "Test User",
                    email: "test@example.com",
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(db.collection("users").doc(userId).get());
        });

        it("should deny users from reading other users' profiles", async () => {
            const userId = "user123";
            const otherUserId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("users")
                    .doc(otherUserId)
                    .set({
                        uid: otherUserId,
                        displayName: "Other User",
                        email: "other@example.com",
                        photoURL: null,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertFails(db.collection("users").doc(otherUserId).get());
        });

        it("should deny unauthenticated users from reading profiles", async () => {
            const userId = "user123";
            const db = testEnv.unauthenticatedContext().firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context.firestore().collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "Test User",
                    email: "test@example.com",
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(db.collection("users").doc(userId).get());
        });

        it("should deny querying users collection", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            // Users can only read their own document, not list/query the collection
            await assertFails(db.collection("users").get());
        });

        it("should deny unauthenticated users from querying users collection", async () => {
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(db.collection("users").get());
        });
    });

    describe("Create Access", () => {
        it("should allow users to create their own profile", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db.collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "Test User",
                    email: "test@example.com",
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny users from creating profiles for other users", async () => {
            const userId = "user123";
            const otherUserId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db.collection("users").doc(otherUserId).set({
                    uid: otherUserId,
                    displayName: "Other User",
                    email: "other@example.com",
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny unauthenticated users from creating profiles", async () => {
            const userId = "user123";
            const db = testEnv.unauthenticatedContext().firestore();

            await assertFails(
                db.collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "Test User",
                    email: "test@example.com",
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });
    });

    describe("Update Access", () => {
        it("should allow users to update their own profile", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context.firestore().collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "Test User",
                    email: "test@example.com",
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertSucceeds(
                db.collection("users").doc(userId).update({
                    displayName: "Updated Name",
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny users from updating other users' profiles", async () => {
            const userId = "user123";
            const otherUserId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("users")
                    .doc(otherUserId)
                    .set({
                        uid: otherUserId,
                        displayName: "Other User",
                        email: "other@example.com",
                        photoURL: null,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertFails(
                db.collection("users").doc(otherUserId).update({
                    displayName: "Hacked Name",
                }),
            );
        });
    });

    describe("Delete Access", () => {
        it("should deny users from deleting their own profile", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context.firestore().collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "Test User",
                    email: "test@example.com",
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await assertFails(db.collection("users").doc(userId).delete());
        });

        it("should deny users from deleting other users' profiles", async () => {
            const userId = "user123";
            const otherUserId = "user456";
            const db = testEnv.authenticatedContext(userId).firestore();

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .collection("users")
                    .doc(otherUserId)
                    .set({
                        uid: otherUserId,
                        displayName: "Other User",
                        email: "other@example.com",
                        photoURL: null,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
            });

            await assertFails(db.collection("users").doc(otherUserId).delete());
        });
    });

    describe("Data Shape Validation", () => {
        it("should deny creating profile with uid exceeding 128 characters", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("users")
                    .doc(userId)
                    .set({
                        uid: "a".repeat(129),
                        displayName: "Test User",
                        email: "test@example.com",
                        photoURL: null,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating profile with uid at 128 character limit", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("users")
                    .doc(userId)
                    .set({
                        uid: "a".repeat(128),
                        displayName: "Test User",
                        email: "test@example.com",
                        photoURL: null,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating profile with empty displayName", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db.collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "",
                    email: "test@example.com",
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating profile with displayName exceeding 100 characters", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("users")
                    .doc(userId)
                    .set({
                        uid: userId,
                        displayName: "a".repeat(101),
                        email: "test@example.com",
                        photoURL: null,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating profile with displayName at 100 character limit", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("users")
                    .doc(userId)
                    .set({
                        uid: userId,
                        displayName: "a".repeat(100),
                        email: "test@example.com",
                        photoURL: null,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating profile with email exceeding 320 characters", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("users")
                    .doc(userId)
                    .set({
                        uid: userId,
                        displayName: "Test User",
                        email: "a".repeat(321),
                        photoURL: null,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating profile with photoURL exceeding 2048 characters", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db
                    .collection("users")
                    .doc(userId)
                    .set({
                        uid: userId,
                        displayName: "Test User",
                        email: "test@example.com",
                        photoURL: "https://example.com/" + "a".repeat(2030),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should allow creating profile with photoURL at 2048 character limit", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertSucceeds(
                db
                    .collection("users")
                    .doc(userId)
                    .set({
                        uid: userId,
                        displayName: "Test User",
                        email: "test@example.com",
                        photoURL: "a".repeat(2048),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }),
            );
        });

        it("should deny creating profile with missing required fields", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db.collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "Test User",
                    // missing email
                    photoURL: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }),
            );
        });

        it("should deny creating profile with invalid field types", async () => {
            const userId = "user123";
            const db = testEnv.authenticatedContext(userId).firestore();

            await assertFails(
                db.collection("users").doc(userId).set({
                    uid: userId,
                    displayName: "Test User",
                    email: "test@example.com",
                    photoURL: null,
                    createdAt: "not a number",
                    updatedAt: Date.now(),
                }),
            );
        });
    });
});
