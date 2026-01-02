/**
 * Conversations commands
 */
import { Command } from "commander";
import type { MentoraCLIClient } from "../client.js";
import { error, outputData } from "../utils/output.js";

export function createConversationsCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const conversations = new Command("conversations").description(
        "View conversations",
    );

    conversations
        .command("get")
        .description("Get conversation by ID")
        .argument("<conversationId>", "Conversation ID")
        .action(async (conversationId: string) => {
            const client = await getClient();
            const result = await client.conversations.get(conversationId);
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    conversations
        .command("for-assignment")
        .description("Get conversation for an assignment")
        .argument("<assignmentId>", "Assignment ID")
        .argument("[userId]", "User ID (defaults to your own conversation)")
        .action(async (assignmentId: string, userId?: string) => {
            const client = await getClient();
            const result = await client.conversations.getForAssignment(
                assignmentId,
                userId,
            );
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return conversations;
}
