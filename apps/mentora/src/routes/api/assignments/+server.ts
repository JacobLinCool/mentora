/**
 * Assignments API - Create and List assignments
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    Courses,
    Topics,
    type Assignment,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Create a new assignment
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const body = await event.request.json();
    const {
        courseId,
        topicId,
        title,
        prompt,
        mode,
        startAt,
        dueAt,
        allowLate,
        allowResubmit,
        aiConfig,
        references,
        reminders,
    } = body;

    if (!title || typeof title !== "string" || title.length < 1) {
        throw svelteError(400, "Title is required");
    }

    if (!prompt || typeof prompt !== "string" || prompt.length < 1) {
        throw svelteError(400, "Prompt is required");
    }

    // Verify course access if courseId is provided
    if (courseId) {
        const membershipDoc = await firestore
            .doc(Courses.roster.docPath(courseId, user.uid))
            .get();

        if (!membershipDoc.exists) {
            throw svelteError(403, "Not a member of this course");
        }

        const membership = membershipDoc.data();
        if (!membership || !["owner", "instructor"].includes(membership.role)) {
            throw svelteError(403, "Only instructors can create assignments");
        }
    }

    // Verify topic belongs to course if both are provided
    if (topicId && courseId) {
        const topicDoc = await firestore.doc(Topics.docPath(topicId)).get();

        if (!topicDoc.exists) {
            throw svelteError(404, "Topic not found");
        }

        const topic = topicDoc.data();
        if (topic?.courseId !== courseId) {
            throw svelteError(400, "Topic does not belong to this course");
        }
    }

    const assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const assignment: Assignment = {
        id: assignmentId,
        courseId: courseId || null,
        topicId: topicId || null,
        orderInTopic: null,
        title,
        prompt,
        mode: mode || "instant",
        startAt: startAt || now,
        dueAt: dueAt || null,
        allowLate: allowLate ?? true,
        allowResubmit: allowResubmit ?? false,
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
    };

    const validated = Assignments.schema.parse(assignment);

    // Store aiConfig, references, reminders as separate fields
    const docToSave: Record<string, unknown> = { ...validated };
    if (aiConfig) docToSave.aiConfig = aiConfig;
    if (references) docToSave.references = references;
    if (reminders) docToSave.reminders = reminders;

    await firestore.doc(Assignments.docPath(assignmentId)).set(docToSave);

    return json({ id: assignmentId, ...docToSave }, { status: 201 });
};

/**
 * List assignments
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);

    const url = new URL(event.request.url);
    const courseId = url.searchParams.get("courseId");
    const topicId = url.searchParams.get("topicId");
    const status = url.searchParams.get("status"); // 'active', 'upcoming', 'past'
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    if (!courseId && !topicId) {
        // List all assignments created by the user
        const snapshot = await firestore
            .collection(Assignments.collectionPath())
            .where("createdBy", "==", user.uid)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get();

        const assignments = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return json({ assignments });
    }

    // If courseId is provided, check access
    if (courseId) {
        const courseDoc = await firestore.doc(Courses.docPath(courseId)).get();

        if (!courseDoc.exists) {
            throw svelteError(404, "Course not found");
        }

        const course = courseDoc.data();

        if (course?.visibility !== "public") {
            const membershipDoc = await firestore
                .doc(Courses.roster.docPath(courseId, user.uid))
                .get();

            if (
                !membershipDoc.exists ||
                membershipDoc.data()?.status !== "active"
            ) {
                throw svelteError(403, "Access denied");
            }
        }
    }

    // Build query - execute with filters
    const collectionRef = firestore.collection(Assignments.collectionPath());
    const now = Date.now();

    // Build filter conditions
    const filters: Array<[string, string, unknown]> = [];
    if (courseId) {
        filters.push(["courseId", "==", courseId]);
    }
    if (topicId) {
        filters.push(["topicId", "==", topicId]);
    }
    if (status === "active") {
        filters.push(["startAt", "<=", now]);
    } else if (status === "upcoming") {
        filters.push(["startAt", ">", now]);
    }

    // Apply filters sequentially using type-safe approach
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = collectionRef;
    for (const [field, op, value] of filters) {
        query = query.where(field, op, value);
    }
    query = query.orderBy("startAt", "asc").limit(limit);

    const snapshot = await query.get();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let assignments = snapshot.docs.map((doc: any) => ({
        id: doc.id as string,
        ...doc.data(),
    })) as Array<{ id: string; dueAt?: number | null; [key: string]: unknown }>;

    // Filter by status in memory if needed
    if (status === "active") {
        assignments = assignments.filter((a) => {
            const dueAt = a.dueAt as number | null | undefined;
            return dueAt === null || dueAt === undefined || dueAt > now;
        });
    } else if (status === "past") {
        assignments = assignments.filter((a) => {
            const dueAt = a.dueAt as number | null | undefined;
            return dueAt !== null && dueAt !== undefined && dueAt <= now;
        });
    }

    return json({ assignments });
};
