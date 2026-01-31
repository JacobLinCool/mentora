import { firestore } from "$lib/server/firestore";
import { json } from "@sveltejs/kit";
import {
    joinPath,
    type Conversation,
    type CourseDoc,
    type Submission,
    type Topic,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

// Helper to create conversation derived type locally if not exported fully or just use 'any' for generation flexibility
// But better to use type safety.
// Checking exports... type Conversation is in mentora-firebase.

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
                contents: [],
                contentTypes: [],
            };

            await firestore.collection("topics").doc(topicId).set(topic);
            topicsData.push(topic);

            const assignmentsCount = 3;
            for (let j = 0; j < assignmentsCount; j++) {
                const assignmentId = `assign-${topicId}-${j}`;

                // Determine deadlines
                const ONE_DAY = 86400000;
                let startAt = now - 5 * ONE_DAY;
                let dueAt: number | null = null;
                let typeName = "Quiz";
                let promptContent = `Complete this assignment.`;
                let createSubmission = false;
                let createConversation = false;

                if (i === 1) {
                    if (j === 0) {
                        // Overdue - Quiz with JSON content (Questionnaire)
                        typeName = "Logic Fundamentals Quiz (Overdue)";
                        dueAt = now - ONE_DAY;

                        const questions = [
                            {
                                type: "single_choice",
                                id: "q1",
                                question:
                                    "Which fallacy attacks the person rather than the argument?",
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
                                question: "Select all valid deductive forms:",
                                options: [
                                    "Modus Ponens",
                                    "Modus Tollens",
                                    "Affirming the Consequent",
                                    "Denying the Antecedent",
                                ],
                                required: true,
                            },
                            {
                                type: "short_answer",
                                id: "q3",
                                question: "Define 'Soundness' in one sentence.",
                                placeholder: "Type your answer here...",
                                maxLength: 200,
                                required: true,
                            },
                        ];
                        promptContent = JSON.stringify(questions);
                        createSubmission = true; // In progress
                    } else if (j === 1) {
                        // Due Soon (Active) - Conversation
                        typeName = "AI Ethics Debate (Conversation)";
                        dueAt = now + ONE_DAY;
                        promptContent =
                            "Engage in a debate about the ethics of artificial intelligence. Focus on the trolley problem adaptation.";
                        createSubmission = true;
                        createConversation = true;
                    } else {
                        // No Deadline - Essay
                        typeName = "Political Trends Essay";
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

                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                const assignment: any = {
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

                await firestore
                    .collection("assignments")
                    .doc(assignmentId)
                    .set(assignment);
                assignmentsData.push(assignment);

                // Create Submission
                if (createSubmission) {
                    const submission: Submission = {
                        userId: userId,
                        state: "in_progress",
                        startedAt: now - ONE_DAY,
                        submittedAt: null,
                        late: false,
                        scoreCompletion: null,
                        notes: null,
                    };

                    await firestore
                        .collection(
                            joinPath(
                                "assignments",
                                assignmentId,
                                "submissions",
                            ),
                        )
                        .doc(userId)
                        .set(submission);
                }

                // Create Conversation
                if (createConversation) {
                    const conversationId = `conv-${assignmentId}-${userId}`;
                    const conversation: Conversation = {
                        assignmentId: assignmentId,
                        userId: userId,
                        state: "awaiting_followup", // Simulate mid-conversation
                        lastActionAt: now,
                        createdAt: now - ONE_DAY,
                        updatedAt: now,
                        turns: [
                            {
                                id: "turn-1",
                                type: "topic",
                                text: "I want to discuss the trolley problem.",
                                createdAt: now - ONE_DAY,
                                analysis: null,
                                pendingStartAt: null,
                            },
                            {
                                id: "turn-2",
                                type: "idea",
                                text: "That is a classic ethical dilemma. Would you pull the lever?",
                                createdAt: now - ONE_DAY + 1000,
                                analysis: {
                                    stance: "neutral",
                                },
                                pendingStartAt: null,
                            },
                        ],
                    };

                    await firestore
                        .collection("conversations")
                        .doc(conversationId)
                        .set(conversation);
                }
            }
        }

        // Enroll the user
        const memberData = {
            userId: userId,
            email: "test@example.com",
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
                courseId,
                topics: topicsData.length,
                assignments: assignmentsData.length,
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
