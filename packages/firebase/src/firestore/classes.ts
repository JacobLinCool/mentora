import { z } from "zod";

import { joinPath, zClassMemberRole, zFirebaseTimestamp } from "./shared";

export const zClassDoc = z
    .object({
        id: z.string().describe("Unique identifier for the class."),
        title: z.string().describe("Human-friendly class name."),
        code: z.string().describe("Join code shared with participants."),
        ownerId: z
            .string()
            .describe("UID of the instructor who owns the class."),
        createdAt: zFirebaseTimestamp.describe("Creation timestamp."),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp of the latest class update.",
        ),
    })
    .describe("Class document stored at classes/{classId}.");
export type ClassDoc = z.infer<typeof zClassDoc>;

export const zClassMembership = z
    .object({
        userId: z
            .string()
            .nullable()
            .describe(
                "UID of the enrolled user or null for pending invitations.",
            ),
        email: z
            .string()
            .email()
            .describe("Email address used to invite or identify the member."),
        role: zClassMemberRole.describe("Role granted to the class member."),
        status: z
            .union([
                z.literal("invited"),
                z.literal("active"),
                z.literal("removed"),
            ])
            .describe("Lifecycle status of the roster entry."),
        joinedAt: zFirebaseTimestamp
            .nullable()
            .describe(
                "Timestamp when the member accepted the invitation, if applicable.",
            ),
    })
    .describe("Roster entry stored at classes/{classId}/roster/{memberId}.");
export type ClassMembership = z.infer<typeof zClassMembership>;

export const Classes = {
    collectionPath: () => "classes" as const,
    docPath: (classId: string) => joinPath("classes", classId),
    schema: zClassDoc,
    roster: {
        collectionPath: (classId: string) =>
            joinPath("classes", classId, "roster"),
        docPath: (classId: string, memberId: string) =>
            joinPath("classes", classId, "roster", memberId),
        schema: zClassMembership,
    },
} as const;
