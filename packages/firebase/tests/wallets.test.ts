import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
    assertFails,
    assertSucceeds,
    clearFirestore,
    setup,
    teardown,
} from "./setup";

describe("Wallets/Ledger Security Rules", () => {
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

    it("should deny clients from creating wallets", async () => {
        const userId = "user123";
        const db = testEnv.authenticatedContext(userId).firestore();

        await assertFails(
            db.collection("wallets").doc("wallet123").set({
                ownerType: "user",
                ownerId: userId,
                balanceCredits: 10,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }),
        );
    });

    it("should allow wallet owners to read their wallet and entries", async () => {
        const userId = "user123";
        const otherUserId = "user999";
        const walletId = "wallet123";
        const entryId = "entry123";

        const ownerDb = testEnv.authenticatedContext(userId).firestore();
        const otherDb = testEnv.authenticatedContext(otherUserId).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const fs = context.firestore();
            await fs.collection("wallets").doc(walletId).set({
                ownerType: "user",
                ownerId: userId,
                balanceCredits: 10,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await fs
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .doc(entryId)
                .set({
                    type: "grant",
                    amountCredits: 10,
                    idempotencyKey: null,
                    scope: {
                        courseId: null,
                        topicId: null,
                        assignmentId: null,
                        conversationId: null,
                    },
                    provider: { name: "manual", ref: null },
                    metadata: null,
                    createdBy: null,
                    createdAt: Date.now(),
                });
        });

        await assertSucceeds(ownerDb.collection("wallets").doc(walletId).get());
        await assertSucceeds(
            ownerDb
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .get(),
        );

        await assertFails(otherDb.collection("wallets").doc(walletId).get());
        await assertFails(
            otherDb
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .get(),
        );
    });

    it("should deny clients from creating ledger entries", async () => {
        const userId = "user123";
        const walletId = "wallet123";
        const db = testEnv.authenticatedContext(userId).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context.firestore().collection("wallets").doc(walletId).set({
                ownerType: "user",
                ownerId: userId,
                balanceCredits: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        await assertFails(
            db
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .doc("entry123")
                .set({
                    type: "charge",
                    amountCredits: -1,
                    idempotencyKey: "k1",
                    scope: {
                        courseId: null,
                        topicId: null,
                        assignmentId: null,
                        conversationId: null,
                    },
                    provider: { name: "manual", ref: null },
                    metadata: null,
                    createdBy: userId,
                    createdAt: Date.now(),
                }),
        );
    });

    it("should allow course editors to read host wallets but deny students and outsiders", async () => {
        const ownerId = "teacher123";
        const taId = "ta123";
        const studentId = "student123";
        const outsiderId = "outsider123";
        const courseId = "courseHost123";
        const walletId = "wallet_host_courseHost123";
        const entryId = "entry_host_1";

        const ownerDb = testEnv.authenticatedContext(ownerId).firestore();
        const taDb = testEnv.authenticatedContext(taId).firestore();
        const studentDb = testEnv.authenticatedContext(studentId).firestore();
        const outsiderDb = testEnv.authenticatedContext(outsiderId).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const fs = context.firestore();
            await fs.collection("courses").doc(courseId).set({
                ownerId,
                title: "Host Wallet Course",
                code: "HOSTC1",
                visibility: "private",
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
                    email: "ta@test.local",
                    role: "ta",
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
                    email: "student@test.local",
                    role: "student",
                    status: "active",
                    joinedAt: Date.now(),
                });

            await fs.collection("wallets").doc(walletId).set({
                ownerType: "host",
                ownerId: courseId,
                balanceCredits: 15,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await fs
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .doc(entryId)
                .set({
                    type: "grant",
                    amountCredits: 15,
                    idempotencyKey: null,
                    scope: {
                        courseId,
                        topicId: null,
                        assignmentId: null,
                        conversationId: null,
                    },
                    provider: { name: "manual", ref: null },
                    metadata: null,
                    createdBy: ownerId,
                    createdAt: Date.now(),
                });
        });

        await assertSucceeds(ownerDb.collection("wallets").doc(walletId).get());
        await assertSucceeds(
            ownerDb
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .get(),
        );

        await assertSucceeds(taDb.collection("wallets").doc(walletId).get());
        await assertSucceeds(
            taDb
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .get(),
        );

        await assertFails(studentDb.collection("wallets").doc(walletId).get());
        await assertFails(
            studentDb
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .get(),
        );

        await assertFails(outsiderDb.collection("wallets").doc(walletId).get());
        await assertFails(
            outsiderDb
                .collection("wallets")
                .doc(walletId)
                .collection("entries")
                .get(),
        );
    });
});
