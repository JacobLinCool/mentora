/**
 * Topics API - Create and List topics for a course
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Courses, Topics, type Topic } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Create a new topic
 */
export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;

    // Check if user has permission (owner/instructor)
    const membershipDoc = await firestore
        .doc(Courses.roster.docPath(courseId, user.uid))
        .get();

    if (!membershipDoc.exists) {
        throw svelteError(403, "Not a member of this course");
    }

    const membership = membershipDoc.data();
    if (!membership || !["instructor", "ta"].includes(membership.role)) {
        throw svelteError(403, "Only instructors can create topics");
    }

    const body = await event.request.json();
    const { title, description, order } = body;

    if (!title || typeof title !== "string" || title.length < 1) {
        throw svelteError(400, "Title is required");
    }

    const topicId = `topic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    // Determine order if not provided
    let topicOrder = order;
    if (topicOrder === undefined) {
        const existingTopics = await firestore
            .collection(Topics.collectionPath())
            .where("courseId", "==", courseId)
            .orderBy("order", "desc")
            .limit(1)
            .get();

        const lastTopicData = existingTopics.empty
            ? null
            : existingTopics.docs[0]?.data();
        topicOrder = lastTopicData
            ? ((lastTopicData.order as number) || 0) + 1
            : 1;
    }

    const topic: Topic = {
        id: topicId,
        courseId,
        title,
        description: description || null,
        order: topicOrder,
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
    };

    const validated = Topics.schema.parse(topic);
    await firestore.doc(Topics.docPath(topicId)).set(validated);

    return json(validated, { status: 201 });
};

/**
 * List topics for a course
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const courseId = event.params.id;

    // Check if user has access to the course
    const courseDoc = await firestore.doc(Courses.docPath(courseId)).get();

    if (!courseDoc.exists) {
        throw svelteError(404, "Course not found");
    }

    const course = courseDoc.data();

    // Check access for non-public courses
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

    const snapshot = await firestore
        .collection(Topics.collectionPath())
        .where("courseId", "==", courseId)
        .orderBy("order", "asc")
        .get();

    const topics = snapshot.docs.map((doc) => {
        return Topics.schema.parse({
            id: doc.id,
            ...doc.data(),
        });
    });

    return json({ topics });
};
