import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

export const zAnnouncementType = z
    .union([z.literal("course_announcement")])
    .describe("Persistent announcement category.");
export type AnnouncementType = z.infer<typeof zAnnouncementType>;

export const zCourseAnnouncementPayload = z
    .object({
        courseId: z
            .string()
            .max(128)
            .describe("Course ID where the announcement originated."),
        courseTitle: z
            .string()
            .min(1)
            .max(200)
            .describe("Course title snapshot for UI rendering."),
        courseAnnouncementId: z
            .string()
            .min(1)
            .max(256)
            .describe("ID of the source course announcement."),
        contentPreview: z
            .string()
            .max(300)
            .describe("Preview text shown in announcement inbox."),
    })
    .describe("Payload for announcements generated from course announcements.");
export type CourseAnnouncementPayload = z.infer<
    typeof zCourseAnnouncementPayload
>;

export const zAnnouncementPayload = zCourseAnnouncementPayload;
export type AnnouncementPayload = z.infer<typeof zAnnouncementPayload>;

export const zAnnouncementDoc = z
    .object({
        type: zAnnouncementType,
        payload: zAnnouncementPayload,
        actorId: z
            .string()
            .max(128)
            .describe("UID that triggered this announcement."),
        isRead: z
            .boolean()
            .optional()
            .default(false)
            .describe("Whether the recipient has read this announcement."),
        readAt: zFirebaseTimestamp
            .nullable()
            .optional()
            .default(null)
            .describe("Timestamp when the recipient read this announcement."),
        createdAt: zFirebaseTimestamp.describe("Creation timestamp."),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp of the latest announcement update.",
        ),
    })
    .describe(
        "Announcement document stored at users/{uid}/announcements/{announcementId}.",
    );
export type AnnouncementDoc = z.infer<typeof zAnnouncementDoc>;

export const Announcements = {
    collectionPath: (uid: string) => joinPath("users", uid, "announcements"),
    docPath: (uid: string, announcementId: string) =>
        joinPath("users", uid, "announcements", announcementId),
    schema: zAnnouncementDoc,
} as const;
