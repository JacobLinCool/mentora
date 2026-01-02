/**
 * Users commands
 */
import { Command } from "commander";
import type { MentoraCLIClient } from "../client.js";
import { error, outputData, success } from "../utils/output.js";

export function createUsersCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const users = new Command("users").description("Manage user profiles");

    users
        .command("me")
        .description("Get my profile")
        .action(async () => {
            const client = await getClient();
            const result = await client.users.getMyProfile();
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    users
        .command("get")
        .description("Get a user profile by UID")
        .argument("<uid>", "User ID")
        .action(async (uid: string) => {
            const client = await getClient();
            const result = await client.users.getProfile(uid);
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    users
        .command("update")
        .description("Update my profile")
        .option("--display-name <name>", "Display name")
        .option("--photo-url <url>", "Photo URL")
        .action(
            async (options: { displayName?: string; photoUrl?: string }) => {
                const client = await getClient();
                const updates: Record<string, string | undefined> = {};
                if (options.displayName)
                    updates.displayName = options.displayName;
                if (options.photoUrl) updates.photoURL = options.photoUrl;

                if (Object.keys(updates).length === 0) {
                    error(
                        "No updates provided. Use --display-name or --photo-url.",
                    );
                    process.exit(1);
                }

                const result = await client.users.updateMyProfile(updates);
                if (result.success) {
                    success("Profile updated successfully.");
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    return users;
}
