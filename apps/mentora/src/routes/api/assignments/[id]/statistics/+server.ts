/**
 * Assignment statistics endpoint
 *
 * Provides aggregated statistics for an assignment including:
 * - Completion status
 * - Stance distribution (initial vs final)
 * - Word cloud data
 * - Conversation metrics
 */
import { requireAuth } from "$lib/server/auth";
import { firestore } from "$lib/server/firestore";
import { json, error as svelteError } from "@sveltejs/kit";
import {
    Assignments,
    Conversations,
    Courses,
    type MessageStance,
} from "mentora-firebase";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event);
    const { id: assignmentId } = event.params;

    // Get assignment
    const assignmentDoc = await firestore
        .doc(Assignments.docPath(assignmentId))
        .get();

    if (!assignmentDoc.exists) {
        throw svelteError(404, "Assignment not found");
    }

    const assignment = Assignments.schema.parse({
        id: assignmentDoc.id,
        ...assignmentDoc.data(),
    });

    // Verify instructor access
    if (assignment.courseId) {
        const membershipDoc = await firestore
            .doc(Courses.roster.docPath(assignment.courseId, user.uid))
            .get();

        const membership = membershipDoc.data();
        const isInstructor =
            membership?.role === "instructor" ||
            membership?.role === "ta" ||
            assignment.createdBy === user.uid;

        if (!isInstructor) {
            throw svelteError(
                403,
                "Only instructors can view assignment statistics",
            );
        }
    } else if (assignment.createdBy !== user.uid) {
        throw svelteError(403, "Access denied");
    }

    // Get all conversations for this assignment
    const conversationsSnapshot = await firestore
        .collection(Conversations.collectionPath())
        .where("assignmentId", "==", assignmentId)
        .get();

    const conversations = conversationsSnapshot.docs.map((doc) =>
        Conversations.schema.parse({
            id: doc.id,
            ...doc.data(),
        }),
    );

    // Calculate statistics
    const stats = calculateStatistics(conversations);

    return json({
        assignmentId,
        ...stats,
        lastUpdatedAt: Date.now(),
    });
};

interface StanceDistribution {
    "pro-strong": number;
    "pro-weak": number;
    "con-strong": number;
    "con-weak": number;
    neutral: number;
    undetermined: number;
}

interface WordCloudEntry {
    word: string;
    count: number;
    users: string[];
}

function calculateStatistics(
    conversations: ReturnType<typeof Conversations.schema.parse>[],
) {
    const totalStudents = conversations.length;
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    const initialStances: StanceDistribution = {
        "pro-strong": 0,
        "pro-weak": 0,
        "con-strong": 0,
        "con-weak": 0,
        neutral: 0,
        undetermined: 0,
    };

    const finalStances: StanceDistribution = { ...initialStances };

    const stanceShifts: Map<string, number> = new Map();
    const proWords: Map<string, { count: number; users: Set<string> }> =
        new Map();
    const conWords: Map<string, { count: number; users: Set<string> }> =
        new Map();
    const neutralWords: Map<string, { count: number; users: Set<string> }> =
        new Map();

    let totalTurns = 0;
    let totalDuration = 0;
    let durationsCount = 0;

    for (const conv of conversations) {
        // Completion status
        if (conv.state === "closed") {
            completed++;
        } else if (conv.turns.length > 0) {
            inProgress++;
        } else {
            notStarted++;
        }

        // Turn count
        totalTurns += conv.turns.length;

        // Duration (if conversation has at least 2 turns)
        if (conv.turns.length >= 2) {
            const duration =
                conv.turns[conv.turns.length - 1].createdAt -
                conv.turns[0].createdAt;
            totalDuration += duration;
            durationsCount++;
        }

        // Stance tracking
        const userTurns = conv.turns.filter(
            (t) => t.type === "idea" || t.type === "followup",
        );

        if (userTurns.length > 0) {
            // Initial stance (first turn)
            const firstTurn = userTurns[0];
            const initialStance = firstTurn.analysis?.stance || "undetermined";
            initialStances[initialStance as keyof StanceDistribution]++;

            // Final stance (last turn)
            const lastTurn = userTurns[userTurns.length - 1];
            const finalStance = lastTurn.analysis?.stance || "undetermined";
            finalStances[finalStance as keyof StanceDistribution]++;

            // Track stance shift
            if (initialStance !== finalStance) {
                const shiftKey = `${initialStance}:${finalStance}`;
                stanceShifts.set(
                    shiftKey,
                    (stanceShifts.get(shiftKey) || 0) + 1,
                );
            }

            // Word cloud extraction
            for (const turn of userTurns) {
                const words = extractKeywords(turn.text);
                const stance = turn.analysis?.stance || "neutral";
                const wordMap = getWordMapForStance(
                    stance,
                    proWords,
                    conWords,
                    neutralWords,
                );

                for (const word of words) {
                    if (!wordMap.has(word)) {
                        wordMap.set(word, { count: 0, users: new Set() });
                    }
                    const entry = wordMap.get(word)!;
                    entry.count++;
                    entry.users.add(conv.userId);
                }
            }
        }
    }

    // Format stance shifts
    const formattedShifts = Array.from(stanceShifts.entries()).map(
        ([key, count]) => {
            const [from, to] = key.split(":") as [MessageStance, MessageStance];
            return { from, to, count };
        },
    );

    // Format word clouds
    const formatWordCloud = (
        map: Map<string, { count: number; users: Set<string> }>,
    ): WordCloudEntry[] => {
        return Array.from(map.entries())
            .map(([word, data]) => ({
                word,
                count: data.count,
                users: Array.from(data.users),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50); // Top 50 words
    };

    return {
        totalStudents,
        completionStatus: {
            completed,
            inProgress,
            notStarted,
        },
        stanceDistribution: {
            initial: initialStances,
            final: finalStances,
        },
        stanceShifts: formattedShifts,
        wordCloud: {
            pro: formatWordCloud(proWords),
            con: formatWordCloud(conWords),
            neutral: formatWordCloud(neutralWords),
        },
        averageTurns: totalStudents > 0 ? totalTurns / totalStudents : 0,
        averageDuration:
            durationsCount > 0 ? totalDuration / durationsCount : 0,
    };
}

function getWordMapForStance(
    stance: string,
    proWords: Map<string, { count: number; users: Set<string> }>,
    conWords: Map<string, { count: number; users: Set<string> }>,
    neutralWords: Map<string, { count: number; users: Set<string> }>,
): Map<string, { count: number; users: Set<string> }> {
    if (stance.startsWith("pro")) return proWords;
    if (stance.startsWith("con")) return conWords;
    return neutralWords;
}

function extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set([
        "the",
        "a",
        "an",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "must",
        "shall",
        "can",
        "need",
        "dare",
        "ought",
        "used",
        "to",
        "of",
        "in",
        "for",
        "on",
        "with",
        "at",
        "by",
        "from",
        "as",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "between",
        "under",
        "again",
        "further",
        "then",
        "once",
        "here",
        "there",
        "when",
        "where",
        "why",
        "how",
        "all",
        "each",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "no",
        "nor",
        "not",
        "only",
        "own",
        "same",
        "so",
        "than",
        "too",
        "very",
        "just",
        "and",
        "but",
        "if",
        "or",
        "because",
        "until",
        "while",
        "although",
        "though",
        "i",
        "me",
        "my",
        "myself",
        "we",
        "our",
        "ours",
        "ourselves",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
        "he",
        "him",
        "his",
        "himself",
        "she",
        "her",
        "hers",
        "herself",
        "it",
        "its",
        "itself",
        "they",
        "them",
        "their",
        "theirs",
        "themselves",
        "what",
        "which",
        "who",
        "whom",
        "this",
        "that",
        "these",
        "those",
        "am",
        "think",
        "believe",
        "feel",
        "know",
        "see",
        "say",
        "said",
        "like",
        "get",
        "make",
        "go",
        "going",
        "come",
        "want",
        "take",
        "also",
        "really",
        "well",
        "even",
        "still",
        "many",
        "much",
    ]);

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopWords.has(word));
}
