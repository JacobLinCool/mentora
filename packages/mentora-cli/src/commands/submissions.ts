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
        .option(
            "--status <status>",
            "Filter by status (in_progress/submitted/graded_complete)",
        )
        .option("-l, --limit <n>", "Limit number of results", parseInt)
        .action(
            async (
                assignmentId: string,
                options: { status?: string; limit?: number },
            ) => {
                const client = await getClient();
                const params = new URLSearchParams();
                if (options.status) params.set("status", options.status);
                if (options.limit)
                    params.set("limit", options.limit.toString());

                const result = await client.backend.call<{
                    submissions: unknown[];
                }>(
                    `/api/assignments/${assignmentId}/submissions?${params.toString()}`,
                );
                if (result.success) {
                    outputList(
                        result.data.submissions as Array<{
                            userId: string;
                            state: string;
                            startedAt: number;
                        }>,
                        (submission) =>
                            `${submission.userId} - ${submission.state} - Started: ${formatTimestamp(submission.startedAt)}`,
                    );
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    submissions
        .command("get")
        .description("Get submission details")
        .argument("<assignmentId>", "Assignment ID")
        .argument("[userId]", "User ID (defaults to your own submission)")
        .action(async (assignmentId: string, userId?: string) => {
            const client = await getClient();
            let result;
            if (userId) {
                result = await client.backend.call(
                    `/api/assignments/${assignmentId}/submissions/${userId}`,
                );
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
        .command("grade")
        .description("Grade a submission (instructor only)")
        .argument("<assignmentId>", "Assignment ID")
        .argument("<userId>", "User ID of the submission")
        .option("--score <score>", "Completion score (0-100)", parseFloat)
        .option("--notes <notes>", "Feedback notes")
        .option("--complete", "Mark as graded complete")
        .action(
            async (
                assignmentId: string,
                userId: string,
                options: { score?: number; notes?: string; complete?: boolean },
            ) => {
                const client = await getClient();
                const updates: Record<string, unknown> = {};
                if (options.score !== undefined)
                    updates.scoreCompletion = options.score;
                if (options.notes) updates.notes = options.notes;
                if (options.complete) updates.state = "graded_complete";

                if (Object.keys(updates).length === 0) {
                    error(
                        "No updates provided. Use --score, --notes, or --complete",
                    );
                    process.exit(1);
                }

                const result = await client.backend.call(
                    `/api/assignments/${assignmentId}/submissions/${userId}`,
                    {
                        method: "PATCH",
                        body: JSON.stringify(updates),
                    },
                );
                if (result.success) {
                    success("Submission graded successfully.");
                    outputData(result.data);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

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
