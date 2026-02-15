import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
    assertFails,
    assertSucceeds,
    clearFirestore,
    setup,
    teardown,
} from "./setup";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
    testEnv = await setup();
});

afterAll(async () => {
    await teardown();
});

beforeEach(async () => {
    await clearFirestore();
});

describe("Announcements Security Rules", () => {
    it("allows users to read their own announcements", async () => {
        const userId = "user-1";
        const db = testEnv.authenticatedContext(userId).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .collection("users")
                .doc(userId)
                .collection("announcements")
                .doc("announcement-1")
                .set({
                    type: "course_announcement",
                    payload: {
                        courseId: "course-1",
                        courseTitle: "Course 1",
                        courseAnnouncementId: "course-ann-1",
                        contentPreview: "Preview",
                    },
                    actorId: "teacher-1",
                    isRead: false,
                    readAt: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
        });

        await assertSucceeds(
            db
                .collection("users")
                .doc(userId)
                .collection("announcements")
                .doc("announcement-1")
                .get(),
        );
    });

    it("denies users from reading other users' announcements", async () => {
        const userId = "user-1";
        const otherUserId = "user-2";
        const db = testEnv.authenticatedContext(userId).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .collection("users")
                .doc(otherUserId)
                .collection("announcements")
                .doc("announcement-1")
                .set({
                    type: "course_announcement",
                    payload: {
                        courseId: "course-1",
                        courseTitle: "Course 1",
                        courseAnnouncementId: "course-ann-1",
                        contentPreview: "Preview",
                    },
                    actorId: "teacher-1",
                    isRead: false,
                    readAt: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
        });

        await assertFails(
            db
                .collection("users")
                .doc(otherUserId)
                .collection("announcements")
                .doc("announcement-1")
                .get(),
        );
    });

    it("denies unauthenticated users from reading announcements", async () => {
        const userId = "user-1";
        const db = testEnv.unauthenticatedContext().firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .collection("users")
                .doc(userId)
                .collection("announcements")
                .doc("announcement-1")
                .set({
                    type: "course_announcement",
                    payload: {
                        courseId: "course-1",
                        courseTitle: "Course 1",
                        courseAnnouncementId: "course-ann-1",
                        contentPreview: "Preview",
                    },
                    actorId: "teacher-1",
                    isRead: false,
                    readAt: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
        });

        await assertFails(
            db
                .collection("users")
                .doc(userId)
                .collection("announcements")
                .doc("announcement-1")
                .get(),
        );
    });

    it("allows users to list their own announcements", async () => {
        const userId = "user-1";
        const db = testEnv.authenticatedContext(userId).firestore();

        await assertSucceeds(
            db
                .collection("users")
                .doc(userId)
                .collection("announcements")
                .get(),
        );
    });

    it("denies users from listing other users' announcements", async () => {
        const userId = "user-1";
        const otherUserId = "user-2";
        const db = testEnv.authenticatedContext(userId).firestore();

        await assertFails(
            db
                .collection("users")
                .doc(otherUserId)
                .collection("announcements")
                .get(),
        );
    });

    it("denies client-side create/update/delete on announcements", async () => {
        const userId = "user-1";
        const db = testEnv.authenticatedContext(userId).firestore();
        const docRef = db
            .collection("users")
            .doc(userId)
            .collection("announcements")
            .doc("announcement-1");

        await assertFails(
            docRef.set({
                type: "course_announcement",
                payload: {
                    courseId: "course-1",
                    courseTitle: "Course 1",
                    courseAnnouncementId: "course-ann-1",
                    contentPreview: "Preview",
                },
                actorId: "teacher-1",
                isRead: false,
                readAt: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }),
        );

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context
                .firestore()
                .collection("users")
                .doc(userId)
                .collection("announcements")
                .doc("announcement-1")
                .set({
                    type: "course_announcement",
                    payload: {
                        courseId: "course-1",
                        courseTitle: "Course 1",
                        courseAnnouncementId: "course-ann-1",
                        contentPreview: "Preview",
                    },
                    actorId: "teacher-1",
                    isRead: false,
                    readAt: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
        });

        await assertFails(docRef.update({ isRead: true, readAt: Date.now() }));
        await assertFails(docRef.delete());
    });
});
