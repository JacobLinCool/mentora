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
            const params = new URLSearchParams();
            if (options.assignment)
                params.set("assignmentId", options.assignment);
            if (options.limit) params.set("limit", options.limit.toString());

            // TODO: Backend-only endpoint - consider adding to API client
            const result = await client.backend.call<{
                conversations: unknown[];
            }>(`/api/conversations?${params.toString()}`);
            if (result.success) {
                if (result.data.conversations.length === 0) {
                    info("No conversations found.");
                } else {
                    outputData(result.data.conversations);
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
