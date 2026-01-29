import { firestore } from "$lib/server/firestore";
import { json } from "@sveltejs/kit";
import {
    joinPath,
    type Assignment,
    type CourseDoc,
    type Topic,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
    const allow = url.searchParams.get("allow");
    if (allow !== "true") {
        return json(
            { error: "Not allowed. Please add ?allow=true" },
            { status: 403 },
        );
    }

    const userId = url.searchParams.get("uid") || "test-user-1";

    // Generate Random Data
    const courseId = `course-${Date.now()}`;
    const now = Date.now();

    const course: CourseDoc = {
        title: `Test Course (${new Date().toLocaleTimeString()})`,
        code: `TEST-${Math.floor(Math.random() * 1000)}`,
        ownerId: userId,
        visibility: "public",
        theme: "Logic",
        description:
            "This is a generated test course with diverse assignments (Overdue, Upcoming, No Deadline) and topics.",
        thumbnail: {
            storagePath: "",
            url: "/course-placeholder.jpg",
        },
        createdAt: now,
        updatedAt: now,
        isDemo: true,
        passwordHash: null,
        demoPolicy: null,
        announcements: [],
    };

    try {
        // Create Course
        await firestore.collection("courses").doc(courseId).set(course);

        // Create Topics
        const topicsData = [];
        const assignmentsData = [];

        for (let i = 1; i <= 2; i++) {
            const topicId = `topic-${courseId}-${i}`;
            const topic: Topic = {
                id: topicId,
                courseId: courseId,
                title: i === 1 ? "Fundamentals of Logic" : "Advanced Arguments",
                description:
                    i === 1
                        ? "Basic concepts and definitions."
                        : "Complex structures and fallacies.",
                order: i,
                createdBy: userId,
                createdAt: now,
                updatedAt: now,
            };

            // Fix: Store topics in root collection 'topics', not subcollection
            await firestore.collection("topics").doc(topicId).set(topic);
            topicsData.push(topic);

            // Create Assignments for Topic
            // i=1: Fundamentals (Contains Overdue and Active)
            // i=2: Advanced (Contains Future)

            const assignmentsCount = 3;
            for (let j = 0; j < assignmentsCount; j++) {
                const assignmentId = `assign-${topicId}-${j}`;

                // Determine deadlines
                const ONE_DAY = 86400000;
                let startAt = now - 5 * ONE_DAY;
                let dueAt: number | null = null;
                let typeName = "Quiz";
                let promptContent = `Complete this assignment.`;

                if (i === 1) {
                    if (j === 0) {
                        // Overdue - Quiz with JSON content
                        typeName = "Quiz (Overdue)";
                        dueAt = now - ONE_DAY;

                        const questions = [
                            {
                                type: "single_choice",
                                id: "q1",
                                question:
                                    "What is the primary fallacy in the provided text?",
                                options: [
                                    "Ad Hominem",
                                    "Straw Man",
                                    "Circular Reasoning",
                                    "False Dichotomy",
                                ],
                                required: true,
                            },
                            {
                                type: "multiple_choice",
                                id: "q2",
                                question:
                                    "Which of the following are valid premises? (Select all that apply)",
                                options: [
                                    "All men are mortal",
                                    "Socrates is a man",
                                    "Therefore Socrates is mortal",
                                    "The sky is blue",
                                ],
                                required: true,
                            },
                            {
                                type: "short_answer",
                                id: "q3",
                                question:
                                    "Explain why validity does not imply truth.",
                                placeholder: "Type your answer here...",
                                maxLength: 200,
                                required: true,
                            },
                        ];
                        promptContent = JSON.stringify(questions);
                    } else if (j === 1) {
                        // Due Soon (Active)
                        typeName = "Conversation (Due Soon)";
                        dueAt = now + ONE_DAY;
                        promptContent =
                            "Engage in a debate about the ethics of artificial intelligence. Focus on the trolley problem adaptation.";
                    } else {
                        // No Deadline
                        typeName = "Essay (No Deadline)";
                        dueAt = null;
                        promptContent =
                            "Write a 500-word essay analyzing the impact of social media on political polarization.";
                    }
                } else {
                    // Future Topic
                    startAt = now - ONE_DAY;
                    dueAt = now + (j + 5) * ONE_DAY;
                    typeName = `Advanced Task ${j + 1}`;
                    promptContent = `Prepare for the advanced task on logic structures.`;
                }

                const assignment: Assignment = {
                    id: assignmentId,
                    courseId: courseId,
                    topicId: topicId,
                    orderInTopic: j + 1,
                    title: typeName,
                    prompt: promptContent,
                    mode: "instant",
                    startAt,
                    dueAt,
                    allowLate: true,
                    allowResubmit: true,
                    createdBy: userId,
                    createdAt: now,
                    updatedAt: now,
                };

                // Fix: Store assignments in root collection 'assignments'
                await firestore
                    .collection("assignments")
                    .doc(assignmentId)
                    .set(assignment);
                assignmentsData.push(assignment);
            }
        }

        // Enroll the user (optional, but good for "Enrolled Courses" list)
        // Membership path: courses/{courseId}/roster/{userId}
        const memberData = {
            userId: userId,
            email: "test@example.com", // Added required field
            role: "student",
            status: "active",
            joinedAt: now,
        };
        await firestore
            .collection(joinPath("courses", courseId, "roster"))
            .doc(userId)
            .set(memberData);

        return json({
            success: true,
            message: "Sample data created",
            data: {
                course,
                topics: topicsData,
                assignments: assignmentsData,
            },
        });
    } catch (e) {
        console.error("Failed to generate sample data", e);
        return json(
            {
                success: false,
                error: e instanceof Error ? e.message : "Unknown error",
            },
            { status: 500 },
        );
    }
};

export const POST: RequestHandler = GET;
