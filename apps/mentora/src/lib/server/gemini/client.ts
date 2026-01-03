/**
 * Gemini Live Client
 *
 * Handles connections to Google's Gemini Live API for real-time
 * AI-powered Socratic dialogue.
 */

import { GEMINI_API_KEY } from "$env/static/private";
import type { AssignmentAIConfig, DialecticalStrategy } from "mentora-firebase";

/**
 * Gemini Live session configuration
 */
export interface GeminiSessionConfig {
    /** System instruction for the conversation */
    systemInstruction: string;
    /** Voice configuration */
    voice?: string;
    /** Conversation history for context */
    conversationHistory?: Array<{ role: "user" | "model"; text: string }>;
    /** Safety settings */
    safetySettings?: Array<{ category: string; threshold: string }>;
    /** Maximum output tokens */
    maxOutputTokens?: number;
}

/**
 * Gemini response chunk
 */
export interface GeminiResponseChunk {
    text?: string;
    audioData?: string;
    isComplete: boolean;
    tokenCount?: {
        input: number;
        output: number;
    };
}

/**
 * Gemini Live session state
 */
export type GeminiSessionState =
    | "idle"
    | "connecting"
    | "ready"
    | "generating"
    | "error"
    | "closed";

/**
 * Build system instruction for Socratic dialogue
 */
export function buildSystemInstruction(
    assignmentPrompt: string,
    aiConfig: AssignmentAIConfig,
    topic?: string,
): string {
    const baseInstruction =
        aiConfig.customSystemPrompt || getDefaultSystemPrompt();

    // Replace placeholders
    let instruction = baseInstruction
        .replace("{{topic}}", topic || "the given topic")
        .replace("{{assignment_prompt}}", assignmentPrompt);

    // Add dialectical strategy hints
    if (aiConfig.dialecticalConfig?.enabledStrategies) {
        const strategies = aiConfig.dialecticalConfig.enabledStrategies;
        instruction += `\n\nYou may use the following dialectical strategies:\n`;

        if (strategies.includes("clarify")) {
            instruction += `- CLARIFY: When the student's statement is vague or uses undefined terms, ask for clarification.\n`;
        }
        if (strategies.includes("challenge")) {
            instruction += `- CHALLENGE: When the student provides weak evidence or flawed logic, challenge their reasoning.\n`;
        }
        if (strategies.includes("devils_advocate")) {
            instruction += `- DEVIL'S ADVOCATE: When the student has a one-sided view, present the opposing perspective.\n`;
        }
    }

    // Add termination guidance
    if (aiConfig.autoTermination?.enabled) {
        instruction += `\n\nConversation Guidance:\n`;
        instruction += `- If the student has reached a well-reasoned conclusion, acknowledge it and offer to conclude.\n`;
        instruction += `- If the conversation is going in circles, gently point this out and suggest a new angle.\n`;
        instruction += `- If max turns are approaching, begin guiding toward a summary.\n`;
    }

    return instruction;
}

/**
 * Default system prompt for Socratic dialogue
 */
function getDefaultSystemPrompt(): string {
    return `You are a Socratic tutor engaging in thoughtful dialogue with a student. Your role is to:

1. Never provide direct answers or solutions
2. Ask probing questions to help the student discover insights themselves
3. Challenge assumptions gently but persistently
4. Acknowledge good thinking while pushing for deeper analysis
5. Use dialectical strategies (clarify, challenge, devil's advocate) as appropriate

Topic: {{topic}}
Assignment: {{assignment_prompt}}

Important guidelines:
- Keep responses concise but thought-provoking (2-4 sentences typically)
- Match the student's language and complexity level
- Build on what the student has said rather than introducing new topics abruptly
- If the student seems stuck, offer a gentle prompt or rephrase your question
- Avoid lecturing or providing information dumps

Your goal is to develop the student's critical thinking, not to teach directly.`;
}

/**
 * Analyze student response to determine dialectical strategy
 */
export function analyzeStudentResponse(
    text: string,
    conversationHistory: Array<{ role: string; text: string }>,
): {
    suggestedStrategy: DialecticalStrategy;
    reason: string;
} {
    const lowercaseText = text.toLowerCase();

    // Check for vague statements
    const vaguePatterns = [
        /i think/,
        /i feel like/,
        /maybe/,
        /probably/,
        /kind of/,
        /sort of/,
        /you know/,
        /basically/,
    ];
    const isVague = vaguePatterns.some((p) => p.test(lowercaseText));

    // Check for unsupported claims
    const claimPatterns = [
        /everyone knows/,
        /obviously/,
        /clearly/,
        /it's obvious/,
        /of course/,
        /always/,
        /never/,
    ];
    const hasWeakEvidence = claimPatterns.some((p) => p.test(lowercaseText));

    // Check for one-sided views
    const turnCount = conversationHistory.filter(
        (t) => t.role === "user",
    ).length;
    const isOneSided = turnCount >= 2 && !hasCounterArgumentMention(text);

    if (isVague) {
        return {
            suggestedStrategy: "clarify",
            reason: "Student's statement contains vague or ambiguous language",
        };
    }

    if (hasWeakEvidence) {
        return {
            suggestedStrategy: "challenge",
            reason: "Student made claims without sufficient evidence",
        };
    }

    if (isOneSided && turnCount >= 3) {
        return {
            suggestedStrategy: "devils_advocate",
            reason: "Student has maintained one-sided view for multiple turns",
        };
    }

    // Default to deepening the conversation
    return {
        suggestedStrategy: "deepen",
        reason: "Continue exploring the student's reasoning",
    };
}

function hasCounterArgumentMention(text: string): boolean {
    const counterPatterns = [
        /however/,
        /but/,
        /on the other hand/,
        /although/,
        /while/,
        /some might argue/,
        /critics/,
        /opponents/,
    ];
    return counterPatterns.some((p) => p.test(text.toLowerCase()));
}

/**
 * Check if conversation should be terminated
 */
export function shouldTerminateConversation(
    turns: Array<{ type: string; text: string }>,
    maxTurns: number,
): {
    shouldEnd: boolean;
    reason?: string;
} {
    const turnCount = turns.length;

    // Check max turns
    if (turnCount >= maxTurns * 2) {
        return { shouldEnd: true, reason: "max_turns_reached" };
    }

    // Check for conclusion indicators in recent turns
    const recentUserTurns = turns
        .filter((t) => t.type === "idea" || t.type === "followup")
        .slice(-2);

    const conclusionPatterns = [
        /i now understand/,
        /you've convinced me/,
        /i've changed my mind/,
        /i see your point/,
        /i agree that/,
        /in conclusion/,
        /to summarize/,
        /my final position/,
    ];

    for (const turn of recentUserTurns) {
        if (conclusionPatterns.some((p) => p.test(turn.text.toLowerCase()))) {
            return { shouldEnd: true, reason: "student_reached_conclusion" };
        }
    }

    // Check for circular argument (similar statements repeated)
    if (turnCount >= 8) {
        const userTexts = turns
            .filter((t) => t.type === "idea" || t.type === "followup")
            .map((t) => t.text.toLowerCase());

        const hasSimilarRepeat = detectSimilarStatements(userTexts);
        if (hasSimilarRepeat) {
            return { shouldEnd: true, reason: "circular_argument_detected" };
        }
    }

    return { shouldEnd: false };
}

function detectSimilarStatements(texts: string[]): boolean {
    if (texts.length < 4) return false;

    // Simple similarity check - look for repeated phrases
    const recent = texts.slice(-2);
    const earlier = texts.slice(0, -2);

    for (const recentText of recent) {
        const words = recentText.split(/\s+/).filter((w) => w.length > 4);
        for (const earlierText of earlier) {
            const matchCount = words.filter((w) =>
                earlierText.includes(w),
            ).length;
            if (matchCount / words.length > 0.6) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Calculate token cost based on usage
 */
export function calculateTokenCost(
    inputTokens: number,
    outputTokens: number,
): number {
    // Gemini 2.5 Flash pricing (approximate)
    const inputCostPer1K = 1.0; // $1.0 per 1M tokens
    const outputCostPer1K = 2.5; // $2.5 per 1M tokens

    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;

    return inputCost + outputCost;
}

/**
 * Generate AI response using Gemini API (non-streaming for simplicity)
 * For production, this would use the Gemini Live streaming API
 */
export async function generateAIResponse(
    userMessage: string,
    systemInstruction: string,
    conversationHistory: Array<{ role: "user" | "model"; text: string }>,
): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
}> {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Build contents array from history
    const contents = [
        ...conversationHistory.map((turn) => ({
            role: turn.role,
            parts: [{ text: turn.text }],
        })),
        {
            role: "user" as const,
            parts: [{ text: userMessage }],
        },
    ];

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.8,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usageMetadata = data.usageMetadata || {};

    return {
        text,
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
    };
}
