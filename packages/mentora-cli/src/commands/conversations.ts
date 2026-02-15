/**
 * Conversations commands
 */
import { Command } from "commander";
import type { MentoraCLIClient } from "../client.js";
import { error, info, outputData, success } from "../utils/output.js";

export function createConversationsCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const conversations = new Command("conversations").description(
        "View and manage conversations",
    );

    conversations
        .command("list")
        .description("List my conversations")
        .option("--assignment <assignmentId>", "Filter by assignment ID")
        .option("-l, --limit <n>", "Limit number of results", parseInt)
        .action(async (options: { assignment?: string; limit?: number }) => {
            const client = await getClient();
            const assignmentId = options.assignment?.trim();
            const hasAssignmentFilter = Boolean(assignmentId);

            const result = await client.conversations.listMine(
                hasAssignmentFilter ? undefined : { limit: options.limit },
            );

            if (result.success) {
                let conversations = hasAssignmentFilter
                    ? result.data.filter(
                          (conversation) =>
                              conversation.assignmentId === assignmentId,
                      )
                    : result.data;

                if (hasAssignmentFilter && options.limit) {
                    conversations = conversations.slice(0, options.limit);
                }

                if (conversations.length === 0) {
                    info("No conversations found.");
                } else {
                    outputData(conversations);
                }
            } else {
                error(result.error);
                process.exit(1);
            }
        });

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
        .command("create")
        .description("Create a new conversation for an assignment")
        .argument("<assignmentId>", "Assignment ID")
        .action(async (assignmentId: string) => {
            const client = await getClient();
            const result = await client.conversations.create(assignmentId);
            if (result.success) {
                success(`Conversation ID: ${result.data.id}`);
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

    conversations
        .command("end")
        .description("End a conversation")
        .argument("<conversationId>", "Conversation ID")
        .action(async (conversationId: string) => {
            const client = await getClient();
            const result = await client.conversations.end(conversationId);
            if (result.success) {
                success("Conversation ended successfully.");
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return conversations;
}
