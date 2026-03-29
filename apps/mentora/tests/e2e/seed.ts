/**
 * Seed data in Firebase Emulator for e2e tests.
 * Respects Firestore security rules by using proper auth tokens per operation.
 */

const AUTH_EMULATOR = "http://localhost:9099";
const FIRESTORE = "http://localhost:8080";
const PROJECT = "demo-mentora";
const API_KEY = "fake-api-key";

interface SeedUser {
    uid: string;
    email: string;
    token: string;
}

async function authUser(email: string, password: string): Promise<SeedUser> {
    // Try sign in first
    const res = await fetch(
        `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
    );
    if (res.ok) {
        const d = await res.json();
        return { uid: d.localId, email, token: d.idToken };
    }
    // Sign up
    const res2 = await fetch(
        `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
    );
    if (!res2.ok) throw new Error(`auth failed: ${await res2.text()}`);
    const d = await res2.json();
    return { uid: d.localId, email, token: d.idToken };
}

// Convert JS object → Firestore REST value format
function val(v: unknown): Record<string, unknown> {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === "string") return { stringValue: v };
    if (typeof v === "boolean") return { booleanValue: v };
    if (typeof v === "number" && Number.isInteger(v))
        return { integerValue: String(v) };
    if (typeof v === "number") return { doubleValue: v };
    if (Array.isArray(v))
        return { arrayValue: { values: v.map((x) => val(x)) } };
    if (typeof v === "object") {
        const fields: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(v as Record<string, unknown>))
            fields[k] = val(x);
        return { mapValue: { fields } };
    }
    return { stringValue: String(v) };
}

function toFields(obj: Record<string, unknown>) {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) fields[k] = val(v);
    return { fields };
}

async function writeDoc(
    path: string,
    data: Record<string, unknown>,
    token: string,
) {
    const url = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(toFields(data)),
    });
    if (!res.ok) {
        throw new Error(
            `writeDoc ${path} failed (${res.status}): ${await res.text()}`,
        );
    }
}

export async function createFreshToken(
    email: string,
    password = "test1234",
): Promise<{ token: string; refreshToken: string }> {
    const res = await fetch(
        `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
    );
    if (!res.ok) throw new Error(`signIn failed: ${await res.text()}`);
    const d = await res.json();
    return { token: d.idToken, refreshToken: d.refreshToken };
}

export interface SeedResult {
    mentor: SeedUser;
    student: SeedUser;
    courseId: string;
    assignmentId: string;
}

export async function seedGradingData(): Promise<SeedResult> {
    const now = Date.now();
    const courseId = `e2e-course-${now}`;
    const topicId = `e2e-topic-${now}`;
    const assignmentId = `e2e-assign-${now}`;
    const convId = `e2e-conv-${now}`;

    const mentor = await authUser("e2e-mentor@test.com", "test1234");
    const student = await authUser(`e2e-student-${now}@test.com`, "test1234");

    // 1. User profiles (each user writes their own)
    await writeDoc(
        `users/${mentor.uid}`,
        {
            uid: mentor.uid,
            role: "mentor",
            displayName: "E2E Mentor",
            email: mentor.email,
            photoURL: null,
            createdAt: now,
            updatedAt: now,
        },
        mentor.token,
    );
    await writeDoc(
        `users/${student.uid}`,
        {
            uid: student.uid,
            role: "student",
            displayName: "E2E Student",
            email: student.email,
            photoURL: null,
            createdAt: now,
            updatedAt: now,
        },
        student.token,
    );

    // 2. Course (mentor creates, ownerId = mentor)
    await writeDoc(
        `courses/${courseId}`,
        {
            title: "E2E Test Course",
            code: "E2E-001",
            ownerId: mentor.uid,
            visibility: "public",
            theme: "Testing",
            description: "Course for e2e testing",
            thumbnail: { storagePath: "", url: "/course-placeholder.jpg" },
            createdAt: now,
            updatedAt: now,
            isDemo: false,
            passwordHash: null,
            demoPolicy: null,
            announcements: [],
        },
        mentor.token,
    );

    // 3. Topic (mentor creates)
    await writeDoc(
        `topics/${topicId}`,
        {
            id: topicId,
            courseId,
            title: "E2E Topic",
            description: "Topic for e2e testing",
            order: 1,
            createdBy: mentor.uid,
            createdAt: now,
            updatedAt: now,
            contents: [assignmentId],
            contentTypes: ["assignment"],
        },
        mentor.token,
    );

    // 4. Assignment (mentor creates)
    await writeDoc(
        `assignments/${assignmentId}`,
        {
            id: assignmentId,
            courseId,
            topicId,
            orderInTopic: 1,
            title: "AI Ethics Debate",
            prompt: "Discuss the ethics of artificial intelligence.",
            mode: "instant",
            startAt: now - 86400000,
            dueAt: now + 86400000,
            allowLate: true,
            allowResubmit: true,
            createdBy: mentor.uid,
            createdAt: now,
            updatedAt: now,
        },
        mentor.token,
    );

    // 5. Student creates their own submission (state: in_progress)
    const baseSub = {
        userId: student.uid,
        state: "in_progress",
        startedAt: now - 3600000,
        submittedAt: null,
        late: false,
        scoreCompletion: null,
        notes: null,
        assessment: null,
        assessmentError: null,
        totalSpentUsd: 0,
        budgetExhausted: false,
    };
    await writeDoc(
        `assignments/${assignmentId}/submissions/${student.uid}`,
        baseSub,
        student.token,
    );

    // 6. Student updates to submitted
    await writeDoc(
        `assignments/${assignmentId}/submissions/${student.uid}`,
        { ...baseSub, state: "submitted", submittedAt: now - 1800000 },
        student.token,
    );

    // 7. Mentor updates submission with AI assessment
    await writeDoc(
        `assignments/${assignmentId}/submissions/${student.uid}`,
        {
            ...baseSub,
            state: "submitted",
            submittedAt: now - 1800000,
            assessment: {
                dimensions: {
                    argumentQuality: {
                        score: 4,
                        feedback:
                            "Strong logical reasoning with clear evidence.",
                    },
                    criticalThinking: {
                        score: 3,
                        feedback:
                            "Good analysis but could explore more counterarguments.",
                    },
                    principleExtraction: {
                        score: 4,
                        feedback:
                            "Successfully identified key ethical principles.",
                    },
                    openness: {
                        score: 5,
                        feedback:
                            "Very open to considering alternative viewpoints.",
                    },
                    coherence: {
                        score: 4,
                        feedback: "Well-structured and consistent argument.",
                    },
                },
                overallScore: 4,
                overallFeedback:
                    "Excellent discussion showing strong analytical skills.",
                generatedAt: now - 1000,
            },
        },
        mentor.token,
    );

    // 8. Student creates conversation with turns
    await writeDoc(
        `conversations/${convId}`,
        {
            assignmentId,
            userId: student.uid,
            state: "closed",
            lastActionAt: now - 1800000,
            createdAt: now - 3600000,
            updatedAt: now - 1800000,
            tokenUsage: null,
            turns: [
                {
                    id: "turn-1",
                    type: "topic",
                    text: "I believe AI should be regulated to prevent misuse, but we need to balance innovation with safety.",
                    createdAt: now - 3600000,
                    analysis: null,
                    pendingStartAt: null,
                    tokenUsage: null,
                },
                {
                    id: "turn-2",
                    type: "idea",
                    text: "That is an interesting position. Can you think of a scenario where strict regulation might hinder beneficial AI development?",
                    createdAt: now - 3500000,
                    analysis: { stance: "pro-weak" },
                    pendingStartAt: null,
                    tokenUsage: null,
                },
                {
                    id: "turn-3",
                    type: "followup",
                    text: "In medical research, overly strict rules could slow down AI that helps diagnose diseases earlier. But I still think we need some guardrails.",
                    createdAt: now - 3400000,
                    analysis: null,
                    pendingStartAt: null,
                    tokenUsage: null,
                },
                {
                    id: "turn-4",
                    type: "counterpoint",
                    text: "Good point about medical AI. However, without regulation, an AI misdiagnosis could cause serious harm. How do you weigh these risks?",
                    createdAt: now - 3300000,
                    analysis: { stance: "pro-weak" },
                    pendingStartAt: null,
                    tokenUsage: null,
                },
            ],
        },
        student.token,
    );

    return { mentor, student, courseId, assignmentId };
}
