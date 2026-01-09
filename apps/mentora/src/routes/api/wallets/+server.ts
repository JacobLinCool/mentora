// MOCK API
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { error, json } from "@sveltejs/kit";
import { Wallets, type LedgerEntry } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Add credits to current user's wallet
 *
 * Uses a Firestore transaction to prevent race conditions:
 * - Atomic wallet creation if not exists
 * - Atomic balance update
 * - Idempotency check within transaction
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const body = await event.request.json();
    const { action, amount, paymentMethodId, idempotencyKey } = body;

    // Validate action
    if (action && action !== "addCredits") {
        throw error(400, `Unknown action: ${action}`);
    }

    if (typeof amount !== "number" || amount <= 0) {
        throw error(400, "Amount must be a positive number");
    }

    // Use deterministic wallet ID based on user UID to prevent duplicate wallets
    const walletId = `wallet_${user.uid}`;
    const walletRef = firestore.doc(Wallets.docPath(walletId));

    // Run transaction for atomic read-modify-write
    const result = await firestore.runTransaction(async (transaction) => {
        const now = Date.now();

        // 1. Get or create wallet atomically
        const walletDoc = await transaction.get(walletRef);
        let currentBalance = 0;

        if (!walletDoc.exists) {
            // Create wallet within transaction
            transaction.set(walletRef, {
                ownerType: "user",
                ownerId: user.uid,
                balanceCredits: 0,
                createdAt: now,
                updatedAt: now,
            });
            currentBalance = 0;
        } else {
            const walletData = Wallets.schema.parse(walletDoc.data());
            currentBalance = walletData.balanceCredits;
        }

        // 2. Check idempotency within transaction
        if (idempotencyKey) {
            const entriesCollection = firestore.collection(
                Wallets.entries.collectionPath(walletId),
            );
            const existingEntries = await entriesCollection
                .where("idempotencyKey", "==", idempotencyKey)
                .limit(1)
                .get();

            if (!existingEntries.empty) {
                const entryData = existingEntries.docs[0].data();
                const entry = Wallets.entries.schema.parse(entryData);
                // Return early - idempotent request
                return {
                    isIdempotent: true,
                    message: "Credit already applied (idempotent)",
                    entry,
                    newBalance: currentBalance,
                };
            }
        }

        // 3. Create ledger entry
        const entryRef = firestore
            .collection(Wallets.entries.collectionPath(walletId))
            .doc();
        const entryId = entryRef.id;

        const entry: LedgerEntry = {
            type: "topup",
            amountCredits: amount,
            idempotencyKey: idempotencyKey || null,
            scope: {
                courseId: null,
                topicId: null,
                assignmentId: null,
                conversationId: null,
            },
            provider: {
                name: paymentMethodId ? "stripe" : "manual",
                ref: paymentMethodId || null,
            },
            metadata: null,
            createdBy: user.uid,
            createdAt: now,
        };

        const validatedEntry = Wallets.entries.schema.parse(entry);

        // 4. Update wallet balance atomically
        const newBalance = currentBalance + amount;

        transaction.update(walletRef, {
            balanceCredits: newBalance,
            updatedAt: now,
        });

        // 5. Save ledger entry
        transaction.set(entryRef, validatedEntry);

        return {
            isIdempotent: false,
            id: entryId,
            newBalance,
        };
    });

    // Return appropriate response based on transaction result
    if (result.isIdempotent) {
        return json({
            message: result.message,
            entry: result.entry,
            newBalance: result.newBalance,
        });
    }

    return json({ id: result.id });
};
