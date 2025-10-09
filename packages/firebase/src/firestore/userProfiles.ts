import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

export const zUserProfile = z
    .object({
        uid: z.string().describe("Unique Firebase Authentication user ID."),
        displayName: z
            .string()
            .describe("Full name displayed within the product."),
        email: z
            .email()
            .describe("Verified email address associated with the account."),
        photoURL: z.string().nullable().describe("Optional profile photo URL."),
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
