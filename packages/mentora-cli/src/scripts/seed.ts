/**
 * Seed script for Firebase emulator.
 * Creates a teacher account, course, topic, questionnaire, and conversation assignment.
 *
 * Usage: pnpm seed (from packages/mentora-cli)
 * Requires Firebase emulator running on localhost (auth:9099, firestore:8080)
 */

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const app = initializeApp({ projectId: "mentora-dev" });
const auth = getAuth(app);
const db = getFirestore(app);

const TEACHER_EMAIL = "teacher@mentora.dev";
const TEACHER_PASSWORD = "password123";
const TEACHER_NAME = "Dr. Demo Teacher";
const BASE_URL = "http://localhost:5173";

async function seed() {
    const now = Date.now();

    // 1. Create teacher auth account
    let uid: string;
    try {
        const existing = await auth.getUserByEmail(TEACHER_EMAIL);
        uid = existing.uid;
        console.log(`Teacher account already exists: ${uid}`);
    } catch {
        const user = await auth.createUser({
            email: TEACHER_EMAIL,
            password: TEACHER_PASSWORD,
            displayName: TEACHER_NAME,
        });
        uid = user.uid;
        console.log(`Created teacher account: ${uid}`);
    }

    // 2. Create user profile
    await db.doc(`users/${uid}`).set({
        uid,
        displayName: TEACHER_NAME,
        email: TEACHER_EMAIL,
        photoURL: null,
        activeMode: "mentor",
        createdAt: now,
        updatedAt: now,
    });
    console.log("Created user profile");

    // 3. Create course
    const courseId = `course-${now}`;
    await db.doc(`courses/${courseId}`).set({
        title: "批判思考導論",
        code: `CT-${Math.floor(Math.random() * 10000)}`,
        ownerId: uid,
        visibility: "public",
        theme: "Critical Thinking",
        description:
            "本課程旨在培養學生的批判思考與邏輯推理能力，涵蓋常見邏輯謬誤、論證分析與蘇格拉底式對話。",
        thumbnail: { storagePath: "", url: "/course-placeholder.jpg" },
        isDemo: true,
        passwordHash: null,
        demoPolicy: null,
        announcements: [],
        createdAt: now,
        updatedAt: now,
    });
    console.log(`Created course: ${courseId}`);

    // 4. Add teacher to roster as instructor
    await db.doc(`courses/${courseId}/roster/${uid}`).set({
        userId: uid,
        email: TEACHER_EMAIL,
        role: "instructor",
        status: "active",
        joinedAt: now,
        invitedAt: null,
    });
    console.log("Added teacher to roster");

    // 5. Create topic
    const topicId = `topic-${courseId}-1`;
    const questionnaireId = `quest-${topicId}-1`;
    const assignmentId = `assign-${topicId}-1`;

    await db.doc(`topics/${topicId}`).set({
        id: topicId,
        courseId,
        title: "邏輯謬誤與論證分析",
        description: "學習辨識常見的邏輯謬誤，並練習分析與建構有效論證。",
        order: 1,
        createdBy: uid,
        contents: [questionnaireId, assignmentId],
        contentTypes: ["questionnaire", "assignment"],
        createdAt: now,
        updatedAt: now,
    });
    console.log(`Created topic: ${topicId}`);

    // 6. Create questionnaire (all 4 question types)
    await db.doc(`questionnaires/${questionnaireId}`).set({
        id: questionnaireId,
        courseId,
        topicId,
        title: "邏輯謬誤小測驗",
        questions: [
            {
                question: {
                    type: "single_answer_choice",
                    questionText:
                        "以下哪一項是 Ad Hominem（人身攻擊）謬誤的特徵？",
                    options: [
                        "攻擊對方的人格而非論點",
                        "使用過度簡化的二分法",
                        "將論點曲解後再反駁",
                        "以不相關的話題轉移焦點",
                    ],
                },
                required: true,
            },
            {
                question: {
                    type: "multiple_answer_choice",
                    questionText:
                        "以下哪些屬於非形式謬誤（Informal Fallacy）？（複選）",
                    options: [
                        "稻草人謬誤（Straw Man）",
                        "滑坡謬誤（Slippery Slope）",
                        "肯定後件（Affirming the Consequent）",
                        "紅鯡魚謬誤（Red Herring）",
                        "訴諸權威（Appeal to Authority）",
                    ],
                },
                required: true,
            },
            {
                question: {
                    type: "short_answer",
                    questionText:
                        "請用自己的話解釋什麼是「稻草人謬誤」（Straw Man Fallacy），並舉一個日常生活中的例子。",
                },
                required: true,
            },
            {
                question: {
                    type: "slider_answer",
                    questionText: "你對自己辨識邏輯謬誤的能力有多少信心？",
                    minLabel: "完全沒有信心",
                    maxLabel: "非常有信心",
                    minValue: 1,
                    maxValue: 10,
                    step: 1,
                },
                required: false,
            },
        ],
        startAt: now - 86400000,
        dueAt: now + 7 * 86400000,
        allowLate: true,
        allowResubmit: true,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
    });
    console.log(`Created questionnaire: ${questionnaireId}`);

    // 7. Create conversation assignment
    await db.doc(`assignments/${assignmentId}`).set({
        id: assignmentId,
        courseId,
        topicId,
        orderInTopic: 2,
        title: "AI 道德決策權辯論",
        question: "探討 AI 是否應該被賦予道德決策權",
        prompt: "在這個對話作業中，你將與 AI 進行一場蘇格拉底式辯論，主題為「AI 是否應該被賦予道德決策權」。請從你的立場出發，提出論點並回應 AI 的挑戰。思考以下面向：自動駕駛的電車問題、醫療 AI 的生死決策、司法 AI 的量刑判斷。目標不是贏得辯論，而是深化你對這個議題的理解。",
        mode: "instant",
        startAt: now - 86400000,
        dueAt: now + 14 * 86400000,
        allowLate: true,
        allowResubmit: true,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
    });
    console.log(`Created assignment: ${assignmentId}`);

    // Done
    const courseLink = `${BASE_URL}/courses/${courseId}`;
    console.log("\n========================================");
    console.log("Seed completed!");
    console.log(`Course link: ${courseLink}`);
    console.log(`Login: ${TEACHER_EMAIL} / ${TEACHER_PASSWORD}`);
    console.log("========================================");
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
