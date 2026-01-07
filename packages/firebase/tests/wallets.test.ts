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
});
