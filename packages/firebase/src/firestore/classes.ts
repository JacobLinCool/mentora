import { z } from "zod";

import { joinPath, zClassMemberRole, zFirebaseTimestamp } from "./shared";

export const zClassDoc = z
    .object({
        id: z
            .string()
            .min(6)
            .max(128)
            .describe("Unique identifier for the class."),
        title: z
            .string()
            .min(1)
            .max(200)
            .describe("Human-friendly class name."),
        code: z
            .string()
            .min(6)
            .max(64)
            .describe("Join code shared with participants."),
        ownerId: z
            .string()
            .max(128)
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
            .max(128)
            .nullable()
            .describe(
                "UID of the enrolled user or null for pending invitations.",
            ),
        email: z
            .email()
            .max(320)
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
