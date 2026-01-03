/**
 * Wallet Credits API - Add credits to user's wallet
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Wallets, type LedgerEntry } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Add credits to current user's wallet
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const body = await event.request.json();
    const { amount, paymentMethodId, idempotencyKey } = body;

    if (typeof amount !== "number" || amount <= 0) {
        throw svelteError(400, "Amount must be a positive number");
    }

    // Find user's wallet
    const walletsSnapshot = await firestore
        .collection(Wallets.collectionPath())
        .where("ownerId", "==", user.uid)
        .where("ownerType", "==", "user")
        .limit(1)
        .get();

    let walletId: string = "";
    let currentBalance: number = 0;

    if (walletsSnapshot.empty) {
        // Create a new wallet
        walletId = `wallet_${user.uid}`;
        currentBalance = 0;
        const now = Date.now();

        await firestore.doc(Wallets.docPath(walletId)).set({
            id: walletId,
            ownerType: "user",
            ownerId: user.uid,
            balanceCredits: 0,
            createdAt: now,
            updatedAt: now,
        });
    } else {
        const walletDoc = walletsSnapshot.docs[0];
        walletId = walletDoc?.id || `wallet_${user.uid}`;
        const walletData = walletDoc?.data();
        currentBalance = (walletData?.balanceCredits as number) || 0;
    }

    // Check idempotency
    if (idempotencyKey) {
        const existingEntry = await firestore
            .collection(Wallets.entries.collectionPath(walletId))
            .where("idempotencyKey", "==", idempotencyKey)
            .limit(1)
            .get();

        if (!existingEntry.empty) {
            return json({
                message: "Credit already applied (idempotent)",
                entry: {
                    id: existingEntry.docs[0].id,
                    ...existingEntry.docs[0].data(),
                },
            });
        }
    }

    const now = Date.now();
    const entryId = `entry_${now}_${Math.random().toString(36).substring(2, 8)}`;

    // Create ledger entry
    const entry: LedgerEntry = {
        id: entryId,
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

    // Update wallet balance
    const newBalance = currentBalance + amount;

    await firestore.doc(Wallets.docPath(walletId)).update({
        balanceCredits: newBalance,
        updatedAt: now,
    });

    // Save ledger entry
    await firestore
        .doc(Wallets.entries.docPath(walletId, entryId))
        .set(validatedEntry);

    return json(
        {
            message: "Credits added successfully",
            entry: validatedEntry,
            newBalance,
        },
        { status: 201 },
    );
};
