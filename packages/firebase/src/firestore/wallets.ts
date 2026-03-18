import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

export const zWalletStatus = z
    .union([
        z.literal("active"),
        z.literal("suspended"),
        z.literal("invalid_key"),
    ])
    .describe("Wallet operational status.");
export type WalletStatus = z.infer<typeof zWalletStatus>;

export const zWallet = z
    .object({
        courseId: z
            .string()
            .max(128)
            .describe("Course this wallet belongs to."),
        apiKey: z.string().min(1).max(256).describe("Gemini API key."),
        apiKeyLastFour: z
            .string()
            .max(4)
            .describe("Last 4 chars of API key for display."),
        spendingLimitUsd: z
            .number()
            .nonnegative()
            .describe("Course spending limit in USD."),
        totalSpentUsd: z
            .number()
            .nonnegative()
            .describe("Cumulative spend in USD."),
        status: zWalletStatus.describe("Wallet operational status."),
        createdAt: zFirebaseTimestamp.describe("Creation timestamp."),
        updatedAt: zFirebaseTimestamp.describe("Last update timestamp."),
    })
    .describe("Course wallet document stored at wallets/{courseId}.");
export type Wallet = z.infer<typeof zWallet>;

export const Wallets = {
    collectionPath: () => "wallets" as const,
    docPath: (courseId: string) => joinPath("wallets", courseId),
    schema: zWallet,
} as const;
