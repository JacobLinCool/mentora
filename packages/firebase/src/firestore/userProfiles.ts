import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

export const zUserProfile = z
    .object({
        uid: z
            .string()
            .max(128)
            .describe("Unique Firebase Authentication user ID."),
        activeMode: z
            .union([z.literal("mentor"), z.literal("student")])
            .optional()
            .default("student")
            .describe("Current UI mode preference for this user."),
        displayName: z
            .string()
            .min(1)
            .max(100)
            .describe("Full name displayed within the product."),
        email: z
            .email()
            .max(320)
            .describe("Verified email address associated with the account."),
        photoURL: z
            .string()
            .max(2048)
            .nullable()
            .optional()
            .default(null)
            .describe("Optional profile photo URL."),
        createdAt: zFirebaseTimestamp.describe(
            "Timestamp when the profile document was created.",
        ),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp of the last profile update.",
        ),
    })
    .describe("User profile document stored at users/{uid}.");
export type UserProfile = z.infer<typeof zUserProfile>;

export const UserProfiles = {
    collectionPath: () => "users" as const,
    docPath: (uid: string) => joinPath("users", uid),
    schema: zUserProfile,
} as const;
