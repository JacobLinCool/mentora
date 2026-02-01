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

export const GET: RequestHandler = async (event) => {
    const { url } = event;
    const allow = url.searchParams.get("allow");
    if (allow !== "true") {
        return json(
            { error: "Not allowed. Please add ?allow=true" },
            { status: 403 },
        );
    }

    // Generate Random Data
    const userId = "sample-instructor";
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
            const contents: string[] = [];
            const contentTypes: ("assignment" | "questionnaire")[] = [];

            const assignmentsCount = 3;
            for (let j = 0; j < assignmentsCount; j++) {
                const assignmentId = `assign-${topicId}-${j}`;

                // Determine deadlines
                const ONE_DAY = 86400000;
                let startAt = now - 5 * ONE_DAY;
                let dueAt: number | null = null;
                let typeName;
                let promptContent;
                let createSubmission = false;
                let createConversation = false;

                if (i === 1 && j === 0) {
                    // Questionnaire (Quiz-like)
                    // Use Dual-Doc strategy logic for consistency
                    const sharedId = `quest-${topicId}-${j}`;
                    const qTitle = "Logic Fundamentals (Questionnaire)";
                    const qStartAt = now - 5 * ONE_DAY;
                    const qDueAt = now - ONE_DAY;

                    // 1. Assignment (for submission)
                    const assignment = {
                        id: sharedId,
                        courseId,
                        topicId,
                        orderInTopic: j + 1,
                        title: qTitle,
                        prompt: "Complete the quiz.",
                        mode: "instant",
                        startAt: qStartAt,
                        dueAt: qDueAt,
                        allowLate: true,
                        allowResubmit: true,
                        createdBy: userId,
                        createdAt: now,
                        updatedAt: now,
                    };
                    await firestore
                        .collection("assignments")
                        .doc(sharedId)
                        .set(assignment);

                    // 2. Questionnaire (for content)
                    const questionnaire = {
                        id: sharedId,
                        courseId,
                        topicId,
                        title: qTitle,
                        questions: [
                            {
                                question: {
                                    type: "single_answer_choice",
                                    questionText:
                                        "Which fallacy attacks the person rather than the argument?",
                                    options: [
                                        "Ad Hominem",
                                        "Straw Man",
                                        "Red Herring",
                                        "False Dichotomy",
                                    ],
                                },
                                required: true,
                            },
                        ],
                        responses: null,
                        startAt: qStartAt,
                        dueAt: qDueAt,
                        allowLate: true,
                        allowResubmit: true,
                        createdBy: userId,
                        createdAt: now,
                        updatedAt: now,
                    };

                    await firestore
                        .collection("questionnaires")
                        .doc(sharedId)
                        .set(questionnaire);
                    contents.push(sharedId);
                    contentTypes.push("questionnaire");
                    continue;
                }

                if (i === 2 && j === 0) {
                    // Questionnaire in Topic 2
                    const sharedId = `quest-${topicId}-${j}`;
                    const qTitle = `Advanced Check ${j + 1}`;
                    const qStartAt = now - ONE_DAY;
                    const qDueAt = now + (j + 5) * ONE_DAY;

                    // 1. Assignment
                    const assignment = {
                        id: sharedId,
                        courseId,
                        topicId,
                        orderInTopic: j + 1,
                        title: qTitle,
                        prompt: "Complete the check.",
                        mode: "instant",
                        startAt: qStartAt,
                        dueAt: qDueAt,
                        allowLate: true,
                        allowResubmit: true,
                        createdBy: userId,
                        createdAt: now,
                        updatedAt: now,
                    };
                    await firestore
                        .collection("assignments")
                        .doc(sharedId)
                        .set(assignment);

                    // 2. Questionnaire
                    const questionnaire = {
                        id: sharedId,
                        courseId,
                        topicId,
                        title: qTitle,
                        questions: [
                            {
                                question: {
                                    type: "single_answer_choice",
                                    questionText: "Is this valid?",
                                    options: ["Yes", "No"],
                                },
                                required: true,
                            },
                        ],
                        responses: null,
                        startAt: qStartAt,
                        dueAt: qDueAt,
                        allowLate: true,
                        allowResubmit: true,
                        createdBy: userId,
                        createdAt: now,
                        updatedAt: now,
                    };

                    await firestore
                        .collection("questionnaires")
                        .doc(sharedId)
                        .set(questionnaire);
                    contents.push(sharedId);
                    contentTypes.push("questionnaire");
                    continue;
                }

                // Assignments
                let targetType: "assignment" | "questionnaire" = "assignment";
                let intendedSubtype: "conversation" | "essay" | "assignment" =
                    "conversation";

                if (i === 1) {
                    if (j === 1) {
                        // Due Soon (Active) - Conversation
                        typeName = "AI Ethics Debate (Conversation)";
                        dueAt = now + ONE_DAY;
                        promptContent =
                            "Engage in a debate about the ethics of artificial intelligence. Focus on the trolley problem adaptation.";
                        createSubmission = true;
                        createConversation = true;
                        intendedSubtype = "conversation";

                        // Create Assignment (Conversation)
                        const assignment = {
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

                        contents.push(assignmentId);
                        contentTypes.push("assignment");
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
                                .collection("assignments")
                                .doc(assignmentId)
                                .collection("submissions")
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
                    } else {
                        // No Deadline - Essay -> NOW QUESTIONNAIRE (Essay Type)
                        // STRATEGY: Create BOTH Assignment and Questionnaire with SAME ID
                        // This allows Submission (via Assignment) and Content (via Questionnaire)

                        const sharedId = assignmentId; // Reuse the assignmentId generated above
                        const qTitle = "Political Trends (Essay)";

                        // 1. Create Assignment Doc (for Permissions & Submission)
                        const assignment = {
                            id: sharedId,
                            courseId,
                            topicId,
                            orderInTopic: j + 1,
                            title: qTitle,
                            prompt: "Complete the essay in the questionnaire.",
                            mode: "instant",
                            startAt: now - ONE_DAY,
                            dueAt: null,
                            allowLate: true,
                            allowResubmit: true,
                            createdBy: userId,
                            createdAt: now,
                            updatedAt: now,
                        };

                        await firestore
                            .collection("assignments")
                            .doc(sharedId)
                            .set(assignment);

                        // 2. Create Questionnaire Doc (for Content)
                        const questionnaire = {
                            id: sharedId, // SAME ID
                            courseId,
                            topicId,
                            title: qTitle,
                            questions: [
                                {
                                    question: {
                                        type: "short_answer", // Use short_answer for essay
                                        questionText:
                                            "Write a 500-word essay analyzing the impact of social media on political polarization. (Essay)",
                                        placeholder: "Type your essay here...",
                                        // Standard schema max is 5000. We stick to verification limits.
                                        maxLength: 5000,
                                    },
                                    required: true,
                                },
                            ],
                            responses: null, // No responses stored here
                            startAt: now - ONE_DAY,
                            dueAt: null,
                            allowLate: true,
                            allowResubmit: true,
                            createdBy: userId,
                            createdAt: now,
                            updatedAt: now,
                        };

                        await firestore
                            .collection("questionnaires")
                            .doc(sharedId)
                            .set(questionnaire);

                        contents.push(sharedId);
                        contentTypes.push("questionnaire");

                        // 3. Create Submission (In Progress)
                        // User can verify submission flow manually
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
                            .collection("assignments")
                            .doc(sharedId)
                            .collection("submissions")
                            .doc(userId)
                            .set(submission);
                    }
                } else {
                    // Future - Advanced Task -> Questionnaire (Same Dual Strategy)
                    const sharedId = assignmentId;
                    const qTitle = `Advanced Task ${j + 1}`;
                    const startAt = now - ONE_DAY;
                    const dueAt = now + (j + 5) * ONE_DAY;

                    // 1. Assignment
                    const assignment = {
                        id: sharedId,
                        courseId,
                        topicId,
                        orderInTopic: j + 1,
                        title: qTitle,
                        prompt: "Complete the questionnaire.",
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
                        .doc(sharedId)
                        .set(assignment);

                    // 2. Questionnaire
                    const questionnaire = {
                        id: sharedId,
                        courseId,
                        topicId,
                        title: qTitle,
                        questions: [
                            {
                                question: {
                                    type: "short_answer",
                                    questionText: `Prepare for the advanced task on logic structures. Task ${j + 1}`,
                                    maxLength: 500,
                                },
                                required: false,
                            },
                        ],
                        startAt,
                        dueAt,
                        allowLate: true,
                        allowResubmit: true,
                        createdBy: userId,
                        createdAt: now,
                        updatedAt: now,
                        responses: null,
                    };

                    await firestore
                        .collection("questionnaires")
                        .doc(sharedId)
                        .set(questionnaire);
                    contents.push(sharedId);
                    contentTypes.push("questionnaire");
                }
            }

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
                contents: contents,
                contentTypes: contentTypes,
            };
            await firestore.collection("topics").doc(topicId).set(topic);
            topicsData.push(topic);
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
