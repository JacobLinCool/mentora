/**
 * Submissions commands
 */
import { Command } from "commander";
import type { MentoraCLIClient } from "../client.js";
import {
    error,
    formatTimestamp,
    outputData,
    outputList,
    success,
} from "../utils/output.js";

export function createSubmissionsCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const submissions = new Command("submissions").description(
        "Manage assignment submissions",
    );

    submissions
        .command("list")
        .description("List submissions for an assignment")
        .argument("<assignmentId>", "Assignment ID")
        .option("-l, --limit <n>", "Limit number of results", parseInt)
        .action(async (assignmentId: string, options: { limit?: number }) => {
            const client = await getClient();
            const result = await client.submissions.listForAssignment(
                assignmentId,
                { limit: options.limit },
            );
            if (result.success) {
                outputList(
                    result.data,
                    (submission) =>
                        `${submission.userId} - ${submission.state} - Started: ${formatTimestamp(submission.startedAt)}`,
                );
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    submissions
        .command("get")
        .description("Get submission details")
        .argument("<assignmentId>", "Assignment ID")
        .argument("[userId]", "User ID (defaults to your own submission)")
        .action(async (assignmentId: string, userId?: string) => {
            const client = await getClient();
            let result;
            if (userId) {
                result = await client.submissions.get(assignmentId, userId);
            } else {
                result = await client.submissions.getMine(assignmentId);
            }
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    submissions
        .command("start")
        .description("Start a submission")
        .argument("<assignmentId>", "Assignment ID")
        .action(async (assignmentId: string) => {
            const client = await getClient();
            const result = await client.submissions.start(assignmentId);
            if (result.success) {
                success("Submission started.");
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    submissions
        .command("submit")
        .description("Submit an assignment")
        .argument("<assignmentId>", "Assignment ID")
        .action(async (assignmentId: string) => {
            const client = await getClient();
            const result = await client.submissions.submit(assignmentId);
            if (result.success) {
                success("Assignment submitted.");
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return submissions;
}
