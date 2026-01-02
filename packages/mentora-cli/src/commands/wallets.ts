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
        .action(async () => {
            const client = await getClient();
            const result = await client.wallets.getMine();
            if (result.success) {
                if (result.data) {
                    outputData(result.data);
                } else {
                    info("No wallet found.");
                }
            } else {
                error(result.error);
                process.exit(1);
            }
        });

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
