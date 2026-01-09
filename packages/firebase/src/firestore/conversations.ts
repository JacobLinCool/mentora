import { z } from "zod";

import { joinPath, zConversationState, zFirebaseTimestamp } from "./shared";

export const zTurnType = z
    .union([
        z.literal("topic"),
        z.literal("idea"),
        z.literal("counterpoint"),
        z.literal("followup"),
        z.literal("summary"),
        z.string(),
    ])
    .describe(
        "Label describing the conversational role of a turn. Defaults to free-form strings for future expansion.",
    );
export type TurnType = z.infer<typeof zTurnType>;

export const zMessageStance = z
    .union([
        z.literal("pro-strong"),
        z.literal("pro-weak"),
        z.literal("con-strong"),
        z.literal("con-weak"),
        z.literal("neutral"),
        z.literal("undetermined"),
    ])
    .describe("Automated stance classification for a conversation turn.");
export type MessageStance = z.infer<typeof zMessageStance>;

export const zTurn = z
    .object({
        id: z
            .string()
            .max(128)
            .describe(
                "Unique identifier for the turn within the conversation.",
            ),
        type: zTurnType.describe("Categorization for the turn's purpose."),
        text: z
            .string()
            .min(1)
            .max(20000)
            .describe("Raw message text for the turn."),
        analysis: z
            .object({
                stance: zMessageStance.describe(
                    "Stance classification assigned by AI analysis.",
                ),
            })
            .nullable()
            .optional()
            .default(null)
            .describe("Optional AI-generated analysis for the turn."),
        pendingStartAt: zFirebaseTimestamp
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Timestamp marking when the turn entered a pending state, if any.",
            ),
        createdAt: zFirebaseTimestamp.describe(
            "Timestamp when the turn was created.",
        ),
    })
    .describe("Embedded turn within a conversation document.");
export type Turn = z.infer<typeof zTurn>;

export const zConversation = z
    .object({
        assignmentId: z
            .string()
            .max(128)
            .describe("Assignment this conversation is associated with."),
        userId: z
            .string()
            .max(128)
            .describe("UID of the student participating in the conversation."),
        state: zConversationState.describe(
            "Current lifecycle state of the conversation.",
        ),
        lastActionAt: zFirebaseTimestamp.describe(
            "Timestamp of the most recent student or AI activity.",
        ),
        createdAt: zFirebaseTimestamp.describe(
            "Timestamp when the conversation started.",
        ),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp when the conversation last changed.",
        ),
        turns: z
            .array(zTurn)
            .max(1000)
            .describe(
                "Chronological list of conversational turns between student and AI.",
            ),
    })
    .describe(
        "Conversation document stored at conversations/{conversationId}.",
    );
export type Conversation = z.infer<typeof zConversation>;

export const Conversations = {
    collectionPath: () => "conversations" as const,
    docPath: (conversationId: string) =>
        joinPath("conversations", conversationId),
    schema: zConversation,
} as const;
