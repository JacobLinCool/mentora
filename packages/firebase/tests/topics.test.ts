import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
    assertFails,
    assertSucceeds,
    clearFirestore,
    setup,
    teardown,
} from "./setup";

describe("Topics Security Rules", () => {
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

    it("should allow instructors to create topics for their course", async () => {
        const courseId = "course123";
        const instructorId = "instructor123";
        const topicId = "topic123";
        const db = testEnv.authenticatedContext(instructorId).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const fs = context.firestore();
            await fs.collection("courses").doc(courseId).set({
                id: courseId,
                title: "Test Course",
                code: "ABC123",
                ownerId: instructorId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await fs
                .collection("courses")
                .doc(courseId)
                .collection("roster")
                .doc(instructorId)
                .set({
                    userId: instructorId,
                    email: "instructor@example.com",
                    role: "instructor",
                    status: "active",
                    joinedAt: Date.now(),
                });
        });

        await assertSucceeds(
            db.collection("topics").doc(topicId).set({
                id: topicId,
                courseId,
                title: "Topic Title",
                description: null,
                order: 1,
                contents: [],
                contentTypes: [],
                createdBy: instructorId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }),
        );
    });

    it("should deny students from creating topics", async () => {
        const courseId = "course123";
        const studentId = "student123";
        const topicId = "topic123";
        const db = testEnv.authenticatedContext(studentId).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const fs = context.firestore();
            await fs.collection("courses").doc(courseId).set({
                id: courseId,
                title: "Test Course",
                code: "ABC123",
                ownerId: "owner999",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await fs
                .collection("courses")
                .doc(courseId)
                .collection("roster")
                .doc(studentId)
                .set({
                    userId: studentId,
                    email: "student@example.com",
                    role: "student",
                    status: "active",
                    joinedAt: Date.now(),
                });
        });

        await assertFails(
            db.collection("topics").doc(topicId).set({
                id: topicId,
                courseId,
                title: "Topic Title",
                description: null,
                order: 1,
                contents: [],
                contentTypes: [],
                createdBy: studentId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }),
        );
    });

    it("should allow unauthenticated users to read topics of public courses", async () => {
        const courseId = "coursePublic";
        const topicId = "topicPublic";
        const unauthDb = testEnv.unauthenticatedContext().firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const fs = context.firestore();
            await fs.collection("courses").doc(courseId).set({
                id: courseId,
                title: "Public Course",
                code: "PUB123",
                ownerId: "owner999",
                visibility: "public",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await fs.collection("topics").doc(topicId).set({
                id: topicId,
                courseId,
                title: "Public Topic",
                description: null,
                order: 1,
                contents: [],
                contentTypes: [],
                createdBy: "owner999",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        await assertSucceeds(unauthDb.collection("topics").doc(topicId).get());
        await assertSucceeds(
            unauthDb
                .collection("topics")
                .where("courseId", "==", courseId)
                .get(),
        );
    });

    it("should deny unauthenticated users from reading topics of private courses", async () => {
        const courseId = "coursePrivate";
        const topicId = "topicPrivate";
        const unauthDb = testEnv.unauthenticatedContext().firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const fs = context.firestore();
            await fs.collection("courses").doc(courseId).set({
                id: courseId,
                title: "Private Course",
                code: "PRI123",
                ownerId: "owner999",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await fs.collection("topics").doc(topicId).set({
                id: topicId,
                courseId,
                title: "Private Topic",
                description: null,
                order: 1,
                contents: [],
                contentTypes: [],
                createdBy: "owner999",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        await assertFails(unauthDb.collection("topics").doc(topicId).get());
    });
});
