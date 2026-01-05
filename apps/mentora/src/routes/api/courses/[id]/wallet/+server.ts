/**
 * Course Wallet API - Get/Create wallet for a course
 *
 * Handled on backend to securely manage wallet creation and stats calculation.
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Courses,
    Wallets,
    type LedgerEntry,
    type Wallet,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Get course wallet (only for course owner)
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;

    // Check if user is course owner
    const courseDoc = await firestore.doc(Courses.docPath(courseId)).get();

    if (!courseDoc.exists) {
        throw svelteError(404, "Course not found");
    }

    const course = courseDoc.data();

    if (course?.ownerId !== user.uid) {
        throw svelteError(403, "Only course owner can view course wallet");
    }

    const url = new URL(event.request.url);
    const includeLedger = url.searchParams.get("includeLedger") === "true";
    const ledgerLimit = parseInt(
        url.searchParams.get("ledgerLimit") || "20",
        10,
    );

    // Find course wallet (host wallet)
    const walletsSnapshot = await firestore
        .collection(Wallets.collectionPath())
        .where("ownerId", "==", courseId)
        .where("ownerType", "==", "host")
        .limit(1)
        .get();

    let wallet: Wallet;

    if (walletsSnapshot.empty) {
        // Create a new host wallet for the course
        const walletId = `wallet_host_${courseId}`;
        const now = Date.now();

        wallet = {
            id: walletId,
            ownerType: "host",
            ownerId: courseId,
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

    // Calculate usage stats
    const usageSnapshot = await firestore
        .collection(Wallets.entries.collectionPath(wallet.id))
        .where("type", "==", "charge")
        .get();

    const totalCharges = usageSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + Math.abs((data?.amountCredits as number) || 0);
    }, 0);

    return json({
        wallet,
        ledger: includeLedger ? ledger : undefined,
        stats: {
            totalCharges,
            transactionCount: usageSnapshot.size,
        },
    });
};
