import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Classes, type ClassMembership } from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
    // Verify authentication
    const user = await requireAuth(event);

    // Parse request body
    const body = await event.request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
        throw svelteError(400, "Invalid or missing join code");
    }

    try {
        // Query for class with matching code
        const classesSnapshot = await firestore
            .collection(Classes.collectionPath())
            .where("code", "==", code)
            .limit(1)
            .get();

        if (classesSnapshot.docs.length === 0) {
            throw svelteError(404, "Class not found with this code");
        }

        const classDoc = classesSnapshot.docs[0];
        const classId = classDoc.id;
        const classData = classDoc.data();

        // Validate class document
        const validationResult = Classes.schema.safeParse({
            id: classId,
            ...classData,
        });

        if (!validationResult.success) {
            console.error("Invalid class document:", validationResult.error);
            throw svelteError(500, "Invalid class data");
        }

        // Check if user is already a member
        const existingMembership = await firestore
            .doc(Classes.roster.docPath(classId, user.uid))
            .get();

        if (existingMembership.exists) {
            const membershipData = existingMembership.data();
            if (membershipData?.status === "active") {
                return json({ classId, alreadyMember: true });
            }
            // If user was previously removed or invited, update their status
            await firestore
                .doc(Classes.roster.docPath(classId, user.uid))
                .update({
                    status: "active",
                    joinedAt: Date.now(),
                });

            return json({ classId, rejoined: true });
        }

        // Create new roster entry
        const membership: ClassMembership = {
            userId: user.uid,
            email: user.email,
            role: "student",
            status: "active",
            joinedAt: Date.now(),
        };

        await firestore
            .doc(Classes.roster.docPath(classId, user.uid))
            .set(membership);

        return json({ classId, joined: true });
    } catch (err) {
        console.error("Error joining class:", err);

        // Re-throw SvelteKit errors
        if (err && typeof err === "object" && "status" in err) {
            throw err;
        }

        throw svelteError(500, "Failed to join class");
    }
};
