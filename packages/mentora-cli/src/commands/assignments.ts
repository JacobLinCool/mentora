/**
 * Assignments commands
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

export function createAssignmentsCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const assignments = new Command("assignments").description(
        "Manage assignments",
    );

    assignments
        .command("list")
        .description("List assignments for a course")
        .argument("<courseId>", "Course ID")
        .option("-l, --limit <n>", "Limit number of results", parseInt)
        .action(async (courseId: string, options: { limit?: number }) => {
            const client = await getClient();
            const result = await client.assignments.listForCourse(courseId, {
                limit: options.limit,
            });
            if (result.success) {
                outputList(
                    result.data,
                    (assignment) =>
                        `${assignment.title} - Starts: ${formatTimestamp(assignment.startAt)} [${assignment.id}]`,
                );
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    assignments
        .command("get")
        .description("Get assignment details")
        .argument("<assignmentId>", "Assignment ID")
        .action(async (assignmentId: string) => {
            const client = await getClient();
            const result = await client.assignments.get(assignmentId);
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    assignments
        .command("create")
        .description("Create a new assignment")
        .requiredOption("--course <courseId>", "Course ID")
        .requiredOption("--title <title>", "Assignment title")
        .requiredOption(
            "--prompt <prompt>",
            "Assignment prompt/directions for students",
        )
        .option("--topic <topicId>", "Topic ID")
        .option(
            "--start <timestamp>",
            "Start time (ISO date or Unix timestamp)",
        )
        .option("--due <timestamp>", "Due date (ISO date or Unix timestamp)")
        .option("--allow-late", "Allow late submissions", false)
        .option("--allow-resubmit", "Allow resubmissions", false)
        .action(
            async (options: {
                course: string;
                title: string;
                prompt: string;
                topic?: string;
                start?: string;
                due?: string;
                allowLate?: boolean;
                allowResubmit?: boolean;
            }) => {
                const client = await getClient();

                const parseTime = (value?: string): number | null => {
                    if (!value) return null;
                    const parsed = Date.parse(value);
                    return isNaN(parsed) ? parseInt(value, 10) : parsed;
                };

                const result = await client.assignments.create({
                    courseId: options.course,
                    topicId: options.topic || null,
                    orderInTopic: null,
                    title: options.title,
                    prompt: options.prompt,
                    mode: "instant",
                    startAt: parseTime(options.start) || Date.now(),
                    dueAt: parseTime(options.due),
                    allowLate: options.allowLate || false,
                    allowResubmit: options.allowResubmit || false,
                });
                if (result.success) {
                    success(`Assignment created with ID: ${result.data}`);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    assignments
        .command("update")
        .description("Update an assignment")
        .argument("<assignmentId>", "Assignment ID")
        .option("--title <title>", "Assignment title")
        .option("--prompt <prompt>", "Assignment prompt")
        .option("--due <timestamp>", "Due date (ISO date or Unix timestamp)")
        .option("--allow-late", "Allow late submissions")
        .option("--no-allow-late", "Disallow late submissions")
        .action(
            async (
                assignmentId: string,
                options: {
                    title?: string;
                    prompt?: string;
                    due?: string;
                    allowLate?: boolean;
                },
            ) => {
                const client = await getClient();
                const updates: Record<string, unknown> = {};
                if (options.title) updates.title = options.title;
                if (options.prompt) updates.prompt = options.prompt;
                if (options.due) {
                    const parsed = Date.parse(options.due);
                    updates.dueAt = isNaN(parsed)
                        ? parseInt(options.due, 10)
                        : parsed;
                }
                if (options.allowLate !== undefined)
                    updates.allowLate = options.allowLate;

                if (Object.keys(updates).length === 0) {
                    error("No updates provided.");
                    process.exit(1);
                }

                const result = await client.assignments.update(
                    assignmentId,
                    updates,
                );
                if (result.success) {
                    success("Assignment updated successfully.");
                    outputData(result.data);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    assignments
        .command("delete")
        .description("Delete an assignment")
        .argument("<assignmentId>", "Assignment ID")
        .action(async (assignmentId: string) => {
            const client = await getClient();
            const result = await client.assignments.delete(assignmentId);
            if (result.success) {
                success("Assignment deleted successfully.");
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    assignments
        .command("preview")
        .description("Preview AI response for an assignment")
        .argument("<assignmentId>", "Assignment ID")
        .argument("<message>", "Test message to send")
        .action(async (assignmentId: string, message: string) => {
            const client = await getClient();
            // TODO: Mock endpoint - will be replaced with real AI implementation
            const result = await client.backend.call<{
                response: string;
                strategy: string;
                estimatedTokens: number;
                estimatedCost: number;
            }>(`/api/assignments/${assignmentId}/preview`, {
                method: "POST",
                body: JSON.stringify({ testMessage: message }),
            });
            if (result.success) {
                console.log("\n🤖 AI Response:\n");
                console.log(result.data.response);
                console.log(`\n📊 Strategy: ${result.data.strategy}`);
                console.log(
                    `📈 Estimated tokens: ${result.data.estimatedTokens}`,
                );
                console.log(
                    `💰 Estimated cost: $${result.data.estimatedCost.toFixed(4)}`,
                );
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    assignments
        .command("statistics")
        .description("Get assignment statistics")
        .argument("<assignmentId>", "Assignment ID")
        .action(async (assignmentId: string) => {
            const client = await getClient();
            const result =
                await client.statistics.getCompletionStatus(assignmentId);
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return assignments;
}
