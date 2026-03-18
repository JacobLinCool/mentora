/**
 * Wallets commands
 */
import { Command } from "commander";
import type { MentoraCLIClient } from "../client.js";
import { error, outputData, success } from "../utils/output.js";

export function createWalletsCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const wallets = new Command("wallets").description("Manage course wallets");

    wallets
        .command("get")
        .description("Get wallet for a course")
        .argument("<courseId>", "Course ID")
        .action(async (courseId: string) => {
            const client = await getClient();
            const result = await client.wallets.getCourseWallet(courseId);
            if (result.success) {
                if (result.data) {
                    outputData(result.data);
                } else {
                    error("No wallet found for this course.");
                }
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    wallets
        .command("set")
        .description("Create or update a course wallet")
        .argument("<courseId>", "Course ID")
        .requiredOption("--api-key <key>", "API key for the wallet")
        .requiredOption(
            "--spending-limit <amount>",
            "Spending limit in USD",
            parseFloat,
        )
        .action(
            async (
                courseId: string,
                options: { apiKey: string; spendingLimit: number },
            ) => {
                if (
                    !Number.isFinite(options.spendingLimit) ||
                    options.spendingLimit < 0
                ) {
                    error(
                        "Spending limit must be a valid non-negative number.",
                    );
                    process.exit(1);
                }

                const client = await getClient();
                const result = await client.wallets.createOrUpdate(courseId, {
                    apiKey: options.apiKey,
                    spendingLimitUsd: options.spendingLimit,
                });
                if (result.success) {
                    success("Wallet updated successfully.");
                    outputData(result.data);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    wallets
        .command("validate-key")
        .description("Validate an API key")
        .argument("<apiKey>", "API key to validate")
        .action(async (apiKey: string) => {
            const client = await getClient();
            const result = await client.wallets.validateApiKey(apiKey);
            if (result.success) {
                if (result.data.valid) {
                    success("API key is valid.");
                } else {
                    error("API key is invalid.");
                }
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return wallets;
}
