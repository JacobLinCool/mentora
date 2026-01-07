/**
 * Courses API - Join by code
 *
 * Handled on backend to prevent exposing course list query permissions to frontend.
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { error, json } from "@sveltejs/kit";

import { Courses, type CourseMembership } from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
    // Verify authentication
    const user = await requireAuth(event);

    // Parse request body
    const body = await event.request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
        throw error(400, "Invalid or missing join code");
    }

    // Normalize and validate join code
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,64}$/.test(normalizedCode.replace(/[-_]/g, ""))) {
        throw error(400, "Join code format is invalid");
    }

    try {
        // Query for course with matching code
        const coursesSnapshot = await firestore
            .collection(Courses.collectionPath())
            .where("code", "==", normalizedCode)
            .limit(1)
            .get();

        if (coursesSnapshot.empty) {
            throw error(404, "Course not found with this code");
        }

        const courseDoc = coursesSnapshot.docs[0];
        const courseId = courseDoc.id;
        const courseData = courseDoc.data();

        // Validate course document
        Courses.schema.parse({
            id: courseId,
            ...courseData,
        });

        // Check if user is already a member
        const existingMembership = await firestore
            .doc(Courses.roster.docPath(courseId, user.uid))
            .get();

        if (existingMembership.exists) {
            const membershipData = existingMembership.data();
            if (membershipData?.status === "active") {
                const result = {
                    courseId,
                    joined: false,
                    alreadyMember: true,
                };
                return json(result);
            }
            // If user was previously removed or invited, update their status
            await firestore
                .doc(Courses.roster.docPath(courseId, user.uid))
                .update({
                    status: "active",
                    joinedAt: Date.now(),
                });

            const result = {
                courseId,
                joined: true,
                alreadyMember: false,
            };
            return json(result);
        }

        // Create new roster entry
        const membership: CourseMembership = {
            userId: user.uid,
            email: user.email,
            role: "student",
            status: "active",
            joinedAt: Date.now(),
        };

        await firestore
            .doc(Courses.roster.docPath(courseId, user.uid))
            .set(membership);

        const result = { courseId, joined: true };
        return json(result);
    } catch (err) {
        console.error("Error joining course:", err);
        if (err && typeof err === "object" && "status" in err) {
            throw err;
        }
        throw error(500, "Failed to join course");
    }
};
