import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { error, json } from "@sveltejs/kit";
import {
    Assignments,
    Courses,
    Topics,
    type Assignment,
    type CourseDoc,
    type CourseMembership,
    type Topic,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: sourceCourseId } = event.params;
    const body = await event.request.json();
    const { title, includeContent, includeRoster, isDemo } = body;

    if (!sourceCourseId) throw error(400, "Source Course ID required");

    // Get Source Course
    const sourceRef = firestore.doc(Courses.docPath(sourceCourseId));
    const sourceDoc = await sourceRef.get();

    if (!sourceDoc.exists) {
        throw error(404, "Source course not found");
    }

    const sourceCourse = Courses.schema.parse(sourceDoc.data());

    // Permission Check (Must be owner or instructor)
    if (sourceCourse.ownerId !== user.uid) {
        // Check roster if not owner
        const memberDoc = await firestore
            .doc(Courses.roster.docPath(sourceCourseId, user.uid))
            .get();
        if (
            !memberDoc.exists ||
            !["instructor"].includes(
                Courses.roster.schema.parse(memberDoc.data()).role,
            )
        ) {
            throw error(403, "Not authorized to copy this course");
        }
    }

    // Create New Course
    const now = Date.now();
    const newCourseRef = firestore.collection(Courses.collectionPath()).doc();
    const newCourseId = newCourseRef.id;

    // Generate new code
    // Ensure code is < 64 chars. "COPY_" is 5 chars.
    const prefix = sourceCourse.code.substring(0, 50);
    const newCode =
        `${prefix}_CPY_${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

    const newCourse: CourseDoc = {
        ...sourceCourse,
        title: title || `Copy of ${sourceCourse.title}`,
        code: newCode,
        ownerId: user.uid,
        createdAt: now,
        updatedAt: now,
        isDemo: isDemo !== undefined ? isDemo : !!sourceCourse.isDemo,
        announcements: [],
        visibility: "private",
    };

    // Validate and save
    const validated = Courses.schema.parse(newCourse);
    await newCourseRef.set(validated);

    // Add current user as owner/instructor
    const ownerMembership: CourseMembership = {
        userId: user.uid,
        email: user.email,
        role: "instructor",
        status: "active",
        joinedAt: now,
    };
    await firestore
        .doc(Courses.roster.docPath(newCourseId, user.uid))
        .set(ownerMembership);

    // Copy Roster (Instructors/TAs only)
    if (includeRoster) {
        const rosterQuery = await firestore
            .collection(Courses.roster.collectionPath(sourceCourseId))
            .where("role", "in", ["instructor", "ta"])
            .get();

        if (!rosterQuery.empty) {
            const promises: Promise<unknown>[] = [];

            for (const doc of rosterQuery.docs) {
                const member = Courses.roster.schema.parse(doc.data());
                if (member.userId === user.uid) continue; // Already added

                const newMemberRef = firestore.doc(
                    Courses.roster.docPath(newCourseId, doc.id),
                );
                const newMember: CourseMembership = {
                    ...member,
                    joinedAt: null,
                    status: "invited",
                };

                promises.push(newMemberRef.set(newMember));
            }

            await Promise.all(promises);
        }
    }

    // Copy Content (Topics & Assignments)
    if (includeContent) {
        const topicIdMap = new Map<string, string>(); // old ID -> new ID
        const writePromises: Promise<unknown>[] = [];

        // Copy Topics
        const topicsSnapshot = await firestore
            .collection(Topics.collectionPath())
            .where("courseId", "==", sourceCourseId)
            .get();

        for (const topicDoc of topicsSnapshot.docs) {
            const oldTopic = Topics.schema.parse(topicDoc.data());
            const newTopicRef = firestore
                .collection(Topics.collectionPath())
                .doc();
            const newTopicId = newTopicRef.id;

            topicIdMap.set(oldTopic.id, newTopicId);

            const newTopic: Topic = {
                ...oldTopic,
                id: newTopicId,
                courseId: newCourseId,
                createdBy: user.uid,
                createdAt: now,
                updatedAt: now,
            };

            writePromises.push(newTopicRef.set(Topics.schema.parse(newTopic)));
        }

        // Copy Assignments
        const assignmentsSnapshot = await firestore
            .collection(Assignments.collectionPath())
            .where("courseId", "==", sourceCourseId)
            .get();

        for (const assignmentDoc of assignmentsSnapshot.docs) {
            const oldAssignment = Assignments.schema.parse(
                assignmentDoc.data(),
            );
            const newAssignmentRef = firestore
                .collection(Assignments.collectionPath())
                .doc();
            const newAssignmentId = newAssignmentRef.id;

            // Map old topic ID to new topic ID
            const newTopicId = oldAssignment.topicId
                ? topicIdMap.get(oldAssignment.topicId) || null
                : null;

            const newAssignment: Assignment = {
                ...oldAssignment,
                id: newAssignmentId,
                courseId: newCourseId,
                topicId: newTopicId,
                createdBy: user.uid,
                createdAt: now,
                updatedAt: now,
            };

            writePromises.push(
                newAssignmentRef.set(Assignments.schema.parse(newAssignment)),
            );
        }

        // Execute all writes in parallel
        await Promise.all(writePromises);
    }

    return json({ id: newCourseId });
};
