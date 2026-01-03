/**
 * Wallets API - Get current user's wallet
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json } from "@sveltejs/kit";
import { Wallets, type LedgerEntry, type Wallet } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Get current user's wallet
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const url = new URL(event.request.url);
    const includeLedger = url.searchParams.get("includeLedger") === "true";
    const ledgerLimit = parseInt(
        url.searchParams.get("ledgerLimit") || "20",
        10,
    );

    // Find user's wallet
    const walletsSnapshot = await firestore
        .collection(Wallets.collectionPath())
        .where("ownerId", "==", user.uid)
        .where("ownerType", "==", "user")
        .limit(1)
        .get();

    let wallet: Wallet;

    if (walletsSnapshot.empty) {
        // Create a new wallet for the user
        const walletId = `wallet_${user.uid}`;
        const now = Date.now();

        wallet = {
            id: walletId,
            ownerType: "user",
            ownerId: user.uid,
            balanceCredits: 0,
            createdAt: now,
            updatedAt: now,
        };

        await firestore.doc(Wallets.docPath(walletId)).set(wallet);
    } else {
        const walletDoc = walletsSnapshot.docs[0];
        wallet = Wallets.schema.parse({
            id: walletDoc.id,
            ...walletDoc.data(),
        });
    }

    // Get ledger entries if requested
    let ledger: LedgerEntry[] = [];
    if (includeLedger) {
        const ledgerSnapshot = await firestore
            .collection(Wallets.entries.collectionPath(wallet.id))
            .orderBy("createdAt", "desc")
            .limit(ledgerLimit)
            .get();

        ledger = ledgerSnapshot.docs.map((doc) =>
            Wallets.entries.schema.parse({
                id: doc.id,
                ...doc.data(),
            }),
        );
    }

    return json({
        ...wallet,
        ledger: includeLedger ? ledger : undefined,
    });
};
