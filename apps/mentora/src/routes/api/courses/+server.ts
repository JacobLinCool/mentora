import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Courses,
    type CourseDoc,
    type CourseMembership,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Create a new course
 *
 * This endpoint validates course code uniqueness which requires server-side check.
 * After creation, the user becomes the course owner and instructor.
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const body = await event.request.json();
    const { title, code, visibility, theme, description, isDemo, demoPolicy } =
        body;

    if (!title || typeof title !== "string" || title.length < 1) {
        throw svelteError(400, "Title is required");
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
        throw svelteError(400, "Invalid course code format");
    }

    // Check if code already exists (This is the critical server-side check)
    const existingCourse = await firestore
        .collection(Courses.collectionPath())
        .where("code", "==", courseCode)
        .limit(1)
        .get();

    if (!existingCourse.empty) {
        throw svelteError(409, "Course code already exists");
    }

    const courseId = `course_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const course: CourseDoc = {
        id: courseId,
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
    };

    // Validate and save
    const validated = Courses.schema.parse(course);
    await firestore.doc(Courses.docPath(courseId)).set(validated);

    // Add owner as first member with 'instructor' role
    const membership: CourseMembership = {
        userId: user.uid,
        email: user.email,
        role: "instructor",
        status: "active",
        joinedAt: now,
    };

    await firestore
        .doc(Courses.roster.docPath(courseId, user.uid))
        .set(membership);

    return json(validated, { status: 201 });
};
