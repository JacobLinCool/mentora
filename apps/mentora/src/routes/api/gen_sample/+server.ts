import { PUBLIC_USE_FIREBASE_EMULATOR } from "$env/static/public";
import { requireAuth } from "$lib/server/auth";
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

const isEmulator = PUBLIC_USE_FIREBASE_EMULATOR === "true";
const ONE_DAY = 86400000;

async function createSharedAssignmentQuestionnaire(opts: {
    id: string;
    courseId: string;
    topicId: string;
    orderInTopic: number;
    title: string;
    prompt: string;
    questions: Array<{ question: Record<string, unknown>; required: boolean }>;
    startAt: number;
    dueAt: number | null;
    userId: string;
    now: number;
}): Promise<void> {
    const shared = {
        id: opts.id,
        courseId: opts.courseId,
        topicId: opts.topicId,
        startAt: opts.startAt,
        dueAt: opts.dueAt,
        allowLate: true,
        allowResubmit: true,
        createdBy: opts.userId,
        createdAt: opts.now,
        updatedAt: opts.now,
    };

    await firestore
        .collection("assignments")
        .doc(opts.id)
        .set({
            ...shared,
            orderInTopic: opts.orderInTopic,
            title: opts.title,
            prompt: opts.prompt,
            mode: "instant",
        });

    await firestore
        .collection("questionnaires")
        .doc(opts.id)
        .set({
            ...shared,
            title: opts.title,
            questions: opts.questions,
        });
}

export const GET: RequestHandler = async (event) => {
    if (!isEmulator) {
        return json(
            { error: "This endpoint is only available in emulator mode" },
            { status: 403 },
        );
    }

    await requireAuth(event);

    // Generate deterministic sample data for emulator testing.
    // The hard-coded userId is intentional: sample data uses a fixed identity
    // so test scenarios are reproducible regardless of which user triggers generation.
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

                // Scenario: Questionnaire (Topic 1 pos 0, Topic 2 pos 0)
                if ((i === 1 && j === 0) || (i === 2 && j === 0)) {
                    const sharedId = `quest-${topicId}-${j}`;
                    const qTitle =
                        i === 1
                            ? "Logic Fundamentals (Questionnaire)"
                            : `Advanced Check ${j + 1}`;
                    const qStartAt =
                        i === 1 ? now - 5 * ONE_DAY : now - ONE_DAY;
                    const qDueAt =
                        i === 1 ? now - ONE_DAY : now + (j + 5) * ONE_DAY;
                    const qQuestions =
                        i === 1
                            ? [
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
                              ]
                            : [
                                  {
                                      question: {
                                          type: "single_answer_choice",
                                          questionText: "Is this valid?",
                                          options: ["Yes", "No"],
                                      },
                                      required: true,
                                  },
                              ];

                    await createSharedAssignmentQuestionnaire({
                        id: sharedId,
                        courseId,
                        topicId,
                        orderInTopic: j + 1,
                        title: qTitle,
                        prompt:
                            i === 1
                                ? "Complete the quiz."
                                : "Complete the check.",
                        questions: qQuestions,
                        startAt: qStartAt,
                        dueAt: qDueAt,
                        userId,
                        now,
                    });
                    contents.push(sharedId);
                    contentTypes.push("questionnaire");
                    continue;
                }

                // Scenario: Conversation (Topic 1 pos 1)
                if (i === 1 && j === 1) {
                    const startAt = now - 5 * ONE_DAY;
                    const dueAt = now + ONE_DAY;

                    const assignment = {
                        id: assignmentId,
                        courseId,
                        topicId,
                        orderInTopic: j + 1,
                        title: "AI Ethics Debate (Conversation)",
                        prompt: "Engage in a debate about the ethics of artificial intelligence. Focus on the trolley problem adaptation.",
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

                    const submission: Submission = {
                        userId,
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

                    const conversationId = `conv-${assignmentId}-${userId}`;
                    const conversation: Conversation = {
                        assignmentId,
                        userId,
                        state: "awaiting_followup",
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
                    continue;
                }

                // Scenario: Essay Questionnaire (Topic 1 pos 2)
                if (i === 1 && j === 2) {
                    const sharedId = assignmentId;

                    await createSharedAssignmentQuestionnaire({
                        id: sharedId,
                        courseId,
                        topicId,
                        orderInTopic: j + 1,
                        title: "Political Trends (Essay)",
                        prompt: "Complete the essay in the questionnaire.",
                        questions: [
                            {
                                question: {
                                    type: "short_answer",
                                    questionText:
                                        "Write a 500-word essay analyzing the impact of social media on political polarization. (Essay)",
                                    placeholder: "Type your essay here...",
                                    maxLength: 5000,
                                },
                                required: true,
                            },
                        ],
                        startAt: now - ONE_DAY,
                        dueAt: null,
                        userId,
                        now,
                    });

                    contents.push(sharedId);
                    contentTypes.push("questionnaire");

                    const submission: Submission = {
                        userId,
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
                    continue;
                }

                // Scenario: Advanced Task Questionnaire (Topic 2 pos 1+)
                if (i === 2 && j >= 1) {
                    const sharedId = assignmentId;
                    const startAt = now - ONE_DAY;
                    const dueAt = now + (j + 5) * ONE_DAY;

                    await createSharedAssignmentQuestionnaire({
                        id: sharedId,
                        courseId,
                        topicId,
                        orderInTopic: j + 1,
                        title: `Advanced Task ${j + 1}`,
                        prompt: "Complete the questionnaire.",
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
                        userId,
                        now,
                    });
                    contents.push(sharedId);
                    contentTypes.push("questionnaire");
                } else {
                    throw new Error(
                        `Unexpected scenario: topic=${i}, position=${j}`,
                    );
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
