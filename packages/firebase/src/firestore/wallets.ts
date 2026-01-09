import { z } from "zod";

import { joinPath, zFirebaseTimestamp } from "./shared";

export const zWalletOwnerType = z
    .union([z.literal("user"), z.literal("host")])
    .describe("Owner kind for a wallet.");
export type WalletOwnerType = z.infer<typeof zWalletOwnerType>;

export const zWallet = z
    .object({
        ownerType: zWalletOwnerType.describe("The type of wallet owner."),
        ownerId: z
            .string()
            .max(128)
            .describe("UID of the wallet owner (user/host)."),
        balanceCredits: z
            .number()
            .nonnegative()
            .describe("Cached wallet balance (read model)."),
        createdAt: zFirebaseTimestamp.describe("Creation timestamp."),
        updatedAt: zFirebaseTimestamp.describe(
            "Timestamp of the latest wallet update.",
        ),
    })
    .describe("Wallet document stored at wallets/{walletId}.");
export type Wallet = z.infer<typeof zWallet>;

export const zLedgerEntryType = z
    .union([
        z.literal("topup"),
        z.literal("charge"),
        z.literal("refund"),
        z.literal("grant"),
        z.literal("adjust"),
        z.string(),
    ])
    .describe("Ledger entry type.");
export type LedgerEntryType = z.infer<typeof zLedgerEntryType>;

export const zLedgerEntry = z
    .object({
        type: zLedgerEntryType.describe("Accounting event type."),
        amountCredits: z
            .number()
            .describe(
                "Credit delta. Positive for topup/grant/refund, negative for charge.",
            ),
        idempotencyKey: z
            .string()
            .max(200)
            .nullable()
            .optional()
            .default(null)
            .describe("Optional idempotency key for de-duplication."),
        scope: z
            .object({
                courseId: z
                    .string()
                    .max(128)
                    .nullable()
                    .optional()
                    .default(null),
                topicId: z
                    .string()
                    .max(128)
                    .nullable()
                    .optional()
                    .default(null),
                assignmentId: z
                    .string()
                    .max(128)
                    .nullable()
                    .optional()
                    .default(null),
                conversationId: z
                    .string()
                    .max(128)
                    .nullable()
                    .optional()
                    .default(null),
            })
            .describe("Entity scope associated with this event."),
        provider: z
            .object({
                name: z
                    .union([
                        z.literal("stripe"),
                        z.literal("manual"),
                        z.string(),
                    ])
                    .describe("Provider identifier."),
                ref: z
                    .string()
                    .max(200)
                    .nullable()
                    .optional()
                    .default(null)
                    .describe("Provider reference (e.g., payment intent id)."),
            })
            .describe("Payment provider references."),
        metadata: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .default(null)
            .describe("Optional free-form metadata."),
        createdBy: z
            .string()
            .max(128)
            .nullable()
            .optional()
            .default(null)
            .describe("UID of actor who created this entry, if applicable."),
        createdAt: zFirebaseTimestamp.describe("Creation timestamp."),
    })
    .describe("Ledger entry stored at wallets/{walletId}/entries/{entryId}.");
export type LedgerEntry = z.infer<typeof zLedgerEntry>;

export const Wallets = {
    collectionPath: () => "wallets" as const,
    docPath: (walletId: string) => joinPath("wallets", walletId),
    schema: zWallet,
    entries: {
        collectionPath: (walletId: string) =>
            joinPath("wallets", walletId, "entries"),
        docPath: (walletId: string, entryId: string) =>
            joinPath("wallets", walletId, "entries", entryId),
        schema: zLedgerEntry,
    },
} as const;
