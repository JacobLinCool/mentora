/**
 * Courses API - Create and List courses
 */
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
    const courseCode =
        code?.toUpperCase() ||
        `${title.substring(0, 3).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

    // Validate course code format
    if (!/^[A-Z0-9]{6,64}$/.test(courseCode.replace(/[-_]/g, ""))) {
        throw svelteError(400, "Invalid course code format");
    }

    // Check if code already exists
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

/**
 * List courses for the authenticated user
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const url = new URL(event.request.url);
    const visibility = url.searchParams.get("visibility");
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const role = url.searchParams.get("role"); // Filter by role (owner, instructor, member)

    // Get courses where user is a member
    const membershipSnapshot = await firestore
        .collectionGroup("roster")
        .where("userId", "==", user.uid)
        .where("status", "==", "active")
        .get();

    const courseIds = membershipSnapshot.docs.map((doc) => {
        // Extract courseId from path: courses/{courseId}/roster/{memberId}
        // The collectionGroup query returns docs with nested path info in __path__
        const data = doc.data() as { __path__?: string };
        if (data.__path__) {
            const pathParts = data.__path__.split("/");
            return pathParts[1];
        }
        // Fallback: doc.id in collectionGroup might contain path info
        return doc.id.split("/")[0] || doc.id;
    });

    if (courseIds.length === 0) {
        return json({ courses: [] });
    }

    // Fetch courses in batches (Firestore 'in' limit is 30)
    const courses: CourseDoc[] = [];
    const batchSize = 30;

    for (let i = 0; i < courseIds.length; i += batchSize) {
        const batchIds = courseIds.slice(i, i + batchSize);
        let query = firestore
            .collection(Courses.collectionPath())
            .where("id", "in", batchIds);

        if (visibility) {
            query = query.where("visibility", "==", visibility);
        }

        const snapshot = await query
            .limit(Math.min(limit - courses.length, batchSize))
            .get();

        for (const doc of snapshot.docs) {
            try {
                const course = Courses.schema.parse({
                    id: doc.id,
                    ...doc.data(),
                });
                courses.push(course);
            } catch {
                console.warn(`Invalid course document: ${doc.id}`);
            }
        }

        if (courses.length >= limit) break;
    }

    // Filter by role if specified
    if (role) {
        const userRoles = new Map<string, string>();
        for (const doc of membershipSnapshot.docs) {
            const data = doc.data() as { __path__?: string; role: string };
            let extractedCourseId = doc.id;
            if (data.__path__) {
                const pathParts = data.__path__.split("/");
                extractedCourseId = pathParts[1];
            }
            userRoles.set(extractedCourseId, data.role);
        }

        return json({
            courses: courses.filter((c) => userRoles.get(c.id) === role),
        });
    }

    return json({ courses });
};
