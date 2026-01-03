/**
 * Topic API - Get, Update, Delete a single topic
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import { Courses, Topics } from "mentora-firebase";
import type { RequestHandler } from "./$types";

/**
 * Check if user has permission to modify topic
 */
async function requireTopicPermission(
    topicId: string,
    userId: string,
): Promise<{
    topic: ReturnType<typeof Topics.schema.parse>;
    courseId: string;
}> {
    const topicDoc = await firestore.doc(Topics.docPath(topicId)).get();

    if (!topicDoc.exists) {
        throw svelteError(404, "Topic not found");
    }

    const topic = Topics.schema.parse({
        id: topicDoc.id,
        ...topicDoc.data(),
    });

    const membershipDoc = await firestore
        .doc(Courses.roster.docPath(topic.courseId, userId))
        .get();

    if (!membershipDoc.exists) {
        throw svelteError(403, "Not a member of this course");
    }

    const membership = membershipDoc.data();
    if (!membership || !["owner", "instructor"].includes(membership.role)) {
        throw svelteError(403, "Only instructors can modify topics");
    }

    return { topic, courseId: topic.courseId };
}

/**
 * Get a topic by ID
 */
export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const topicId = event.params.id;

    const topicDoc = await firestore.doc(Topics.docPath(topicId)).get();

    if (!topicDoc.exists) {
        throw svelteError(404, "Topic not found");
    }

    const topic = Topics.schema.parse({
        id: topicDoc.id,
        ...topicDoc.data(),
    });

    // Check if user has access to the course
    const courseDoc = await firestore
        .doc(Courses.docPath(topic.courseId))
        .get();
    const course = courseDoc.data();

    if (course?.visibility !== "public") {
        const membershipDoc = await firestore
            .doc(Courses.roster.docPath(topic.courseId, user.uid))
            .get();

        if (
            !membershipDoc.exists ||
            membershipDoc.data()?.status !== "active"
        ) {
            throw svelteError(403, "Access denied");
        }
    }

    return json(topic);
};

/**
 * Update a topic
 */
export const PATCH: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const topicId = event.params.id;

    await requireTopicPermission(topicId, user.uid);

    const body = await event.request.json();
    const { title, description, order } = body;

    const updates: Record<string, unknown> = {
        updatedAt: Date.now(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (order !== undefined) updates.order = order;

    await firestore.doc(Topics.docPath(topicId)).update(updates);

    const updatedDoc = await firestore.doc(Topics.docPath(topicId)).get();
    const topic = Topics.schema.parse({
        id: updatedDoc.id,
        ...updatedDoc.data(),
    });

    return json(topic);
};

/**
 * Delete a topic
 */
export const DELETE: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const topicId = event.params.id;

    await requireTopicPermission(topicId, user.uid);

    await firestore.doc(Topics.docPath(topicId)).delete();

    return json({ success: true, deleted: topicId });
};
