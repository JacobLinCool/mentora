/**
 * Wallets commands
 */
import { Command } from "commander";
import type { MentoraCLIClient } from "../client.js";
import {
    error,
    formatTimestamp,
    info,
    outputData,
    outputList,
    success,
} from "../utils/output.js";

export function createWalletsCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const wallets = new Command("wallets").description(
        "Manage wallets and credits",
    );

    wallets
        .command("me")
        .description("Get my wallet")
        .option("--ledger", "Include ledger entries")
        .option("-l, --limit <n>", "Limit ledger entries", parseInt, 20)
        .action(async (options: { ledger?: boolean; limit?: number }) => {
            const client = await getClient();
            // Fetch wallet first
            const result = await client.wallets.getMine();
            if (result.success) {
                if (result.data) {
                    const wallet = result.data;
                    const output: Record<string, unknown> = { wallet };

                    if (options.ledger) {
                        const ledgerResult = await client.wallets.listEntries(
                            wallet.id,
                            { limit: options.limit },
                        );
                        if (ledgerResult.success) {
                            output.ledger = ledgerResult.data;
                        } else {
                            error(
                                `Failed to fetch ledger: ${ledgerResult.error}`,
                            );
                        }
                    }
                    outputData(output);
                } else {
                    info("No wallet found.");
                }
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    wallets
        .command("add-credits")
        .description("Add credits to my wallet")
        .argument("<amount>", "Amount of credits to add")
        .option("--idempotency-key <key>", "Idempotency key for deduplication")
        .option("--payment-ref <ref>", "Optional payment provider reference")
        .action(
            async (
                amount: string,
                options: { idempotencyKey?: string; paymentRef?: string },
            ) => {
                const parsedAmount = Number(amount);
                if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                    error(
                        "Amount must be a valid positive number (for example: 10 or 10.5).",
                    );
                    process.exit(1);
                }

                const client = await getClient();
                const idempotencyKey =
                    options.idempotencyKey ??
                    `cli_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
                const result = await client.wallets.addCredits({
                    amount: parsedAmount,
                    idempotencyKey,
                    paymentRef: options.paymentRef ?? null,
                });
                if (result.success) {
                    success("Credits added successfully.");
                    // The backend returns { id } for the transaction
                    console.log(`Transaction ID: ${result.data.id}`);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    wallets
        .command("get")
        .description("Get wallet by ID")
        .argument("<walletId>", "Wallet ID")
        .action(async (walletId: string) => {
            const client = await getClient();
            const result = await client.wallets.get(walletId);
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    wallets
        .command("entries")
        .description("List wallet ledger entries")
        .argument("<walletId>", "Wallet ID")
        .option("-l, --limit <n>", "Limit number of results", parseInt)
        .action(async (walletId: string, options: { limit?: number }) => {
            const client = await getClient();
            const result = await client.wallets.listEntries(walletId, {
                limit: options.limit,
            });
            if (result.success) {
                outputList(
                    result.data,
                    (entry) =>
                        `${entry.amountCredits > 0 ? "+" : ""}${entry.amountCredits} credits - ${entry.type} [${formatTimestamp(entry.createdAt)}]`,
                );
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return wallets;
}
