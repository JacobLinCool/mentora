import { z } from "zod";

import { joinPath, zCourseMemberRole, zFirebaseTimestamp } from "./shared";

export const zCourseVisibility = z
    .union([z.literal("public"), z.literal("unlisted"), z.literal("private")])
    .describe("Visibility level for a course.");
export type CourseVisibility = z.infer<typeof zCourseVisibility>;

export const zCourseThumbnail = z
    .object({
        storagePath: z
            .string()
            .max(1024)
            .describe("Storage path for the thumbnail asset."),
        url: z
            .string()
            .max(2048)
            .nullable()
            .optional()
            .default(null)
            .describe("Optional public URL for the thumbnail."),
    })
    .describe("Thumbnail metadata for a course.");
export type CourseThumbnail = z.infer<typeof zCourseThumbnail>;

export const zCourseDemoPolicy = z
    .object({
        maxFreeCreditsPerUser: z
            .number()
            .nonnegative()
            .describe(
                "Maximum free credits granted per user for this demo course.",
            ),
        maxTurnsPerConversation: z
            .number()
            .int()
            .positive()
            .nullable()
            .optional()
            .default(null)
            .describe("Optional cap on total turns per conversation."),
    })
    .describe("Optional demo policy for cost control.");
export type CourseDemoPolicy = z.infer<typeof zCourseDemoPolicy>;

export const zCourseDoc = z
    .object({
        id: z
            .string()
            .min(6)
            .max(128)
            .describe("Unique identifier for the course."),
        title: z
            .string()
            .min(1)
            .max(200)
            .describe("Human-friendly course name."),
        code: z
            .string()
            .min(6)
            .max(64)
            .describe("Join code shared with participants."),
        ownerId: z
            .string()
            .max(128)
            .describe("UID of the instructor who owns the course."),
        visibility: zCourseVisibility
            .optional()
            .default("private")
            .describe("Public/unlisted/private visibility for this course."),
        passwordHash: z
            .string()
            .max(512)
            .nullable()
            .optional()
            .default(null)
            .describe("Optional password hash for private courses."),
        theme: z
            .string()
            .max(200)
            .nullable()
            .optional()
            .default(null)
            .describe("Optional theme or subject for the course."),
        description: z
            .string()
            .max(5000)
            .nullable()
            .optional()
            .default(null)
            .describe("Optional course description."),
        thumbnail: zCourseThumbnail
            .nullable()
            .optional()
            .default(null)
            .describe("Optional course thumbnail."),
        isDemo: z
            .boolean()
            .optional()
            .default(false)
            .describe(
                "Whether this course is a demo/public experience course.",
            ),
        demoPolicy: zCourseDemoPolicy
            .nullable()
            .optional()
            .default(null)
            .describe("Optional cost-control policy for demo courses."),
        createdAt: zFirebaseTimestamp.describe("Creation timestamp."),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp of the latest course update.",
        ),
    })
    .describe("Course document stored at courses/{courseId}.");
export type CourseDoc = z.infer<typeof zCourseDoc>;

export const zCourseMembership = z
    .object({
        userId: z
            .string()
            .max(128)
            .nullable()
            .optional()
            .default(null)
            .describe(
                "UID of the enrolled user or null for pending invitations.",
            ),
        email: z
            .email()
            .max(320)
            .describe("Email address used to invite or identify the member."),
        role: zCourseMemberRole.describe("Role granted to the course member."),
        status: z
            .union([
                z.literal("invited"),
                z.literal("active"),
                z.literal("removed"),
            ])
            .describe("Lifecycle status of the roster entry."),
        joinedAt: zFirebaseTimestamp
            .nullable()
            .optional()
            .default(null)
            .describe(
                "Timestamp when the member accepted the invitation, if applicable.",
            ),
    })
    .describe("Roster entry stored at courses/{courseId}/roster/{memberId}.");
export type CourseMembership = z.infer<typeof zCourseMembership>;

export const Courses = {
    collectionPath: () => "courses" as const,
    docPath: (courseId: string) => joinPath("courses", courseId),
    schema: zCourseDoc,
    roster: {
        collectionPath: (courseId: string) =>
            joinPath("courses", courseId, "roster"),
        docPath: (courseId: string, memberId: string) =>
            joinPath("courses", courseId, "roster", memberId),
        schema: zCourseMembership,
    },
} as const;
