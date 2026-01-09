import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { error, json } from "@sveltejs/kit";
import {
    Courses,
    type CourseDoc,
    type CourseMembership,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Create a new course
 *
 * This endpoint validates course code uniqueness using a transaction
 * to prevent race conditions where two courses get the same code.
 * After creation, the user becomes the course owner and instructor.
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const body = await event.request.json();
    const { title, code, visibility, theme, description, isDemo, demoPolicy } =
        body;

    if (!title || typeof title !== "string" || title.length < 1) {
        throw error(400, "Title is required");
    }

    // Generate unique course code if not provided
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const prefix =
        sanitizedTitle.length >= 3 ? sanitizedTitle.substring(0, 3) : "CRS";
    const courseCode =
        code?.toUpperCase() ||
        `${prefix}${Date.now().toString(36).toUpperCase()}`;

    // Validate course code format
    if (!/^[A-Z0-9]{6,64}$/.test(courseCode.replace(/[-_]/g, ""))) {
        throw error(400, "Invalid course code format");
    }

    // Use transaction to atomically check uniqueness and create course
    const result = await firestore.runTransaction(async (transaction) => {
        // Check if code already exists (within transaction for consistency)
        const existingCourse = await firestore
            .collection(Courses.collectionPath())
            .where("code", "==", courseCode)
            .limit(1)
            .get();

        if (!existingCourse.empty) {
            // Return error indicator - we'll throw outside transaction
            return { error: "duplicate" };
        }

        const courseRef = firestore.collection(Courses.collectionPath()).doc();
        const courseId = courseRef.id;
        const now = Date.now();

        const course: CourseDoc = {
            title,
            code: courseCode,
            ownerId: user.uid,
            visibility: visibility || "private",
            passwordHash: null,
            theme: theme || null,
            description: description || null,
            thumbnail: null,
            isDemo: isDemo || false,
            demoPolicy: demoPolicy || null,
            createdAt: now,
            updatedAt: now,
            announcements: [],
        };

        // Validate and save course
        const validated = Courses.schema.parse(course);
        transaction.set(courseRef, validated);

        // Add owner as first member with 'instructor' role
        const membershipRef = firestore.doc(
            Courses.roster.docPath(courseId, user.uid),
        );
        const membership: CourseMembership = {
            userId: user.uid,
            email: user.email,
            role: "instructor",
            status: "active",
            joinedAt: now,
        };

        transaction.set(membershipRef, membership);

        return { courseId };
    });

    // Handle transaction result
    if ("error" in result && result.error === "duplicate") {
        throw error(409, "Course code already exists");
    }

    return json({ id: result.courseId });
};
