import { z } from "zod";

export const joinPath = (...segments: string[]) =>
    segments
        .map((segment) => segment.replace(/^\/+|\/+$|\s+/g, ""))
        .filter((segment) => segment.length > 0)
        .join("/");

export const zFirebaseTimestamp = z
    .number()
    .int()
    .nonnegative()
    .describe("Milliseconds since the Unix epoch.");
export type FirebaseTimestamp = z.infer<typeof zFirebaseTimestamp>;

export const zClassMemberRole = z
    .union([z.literal("student"), z.literal("ta"), z.literal("instructor")])
    .describe("Role a user holds within a class roster.");
export type ClassMemberRole = z.infer<typeof zClassMemberRole>;

export const zConversationState = z
    .union([
        z
            .literal("awaiting_idea")
            .describe("Waiting for student to add initial idea."),
        z
            .literal("adding_counterpoint")
            .describe("AI is currently adding the counterpoint."),
        z
            .literal("awaiting_followup")
            .describe("Waiting for student to add follow-up response."),
        z
            .literal("adding_final_summary")
            .describe("AI is currently adding final summary."),
        z.literal("closed").describe("Conversation has been closed."),
    ])
    .describe("Lifecycle state for a conversation-driven submission.");
export type ConversationState = z.infer<typeof zConversationState>;
