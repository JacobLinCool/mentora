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

    return assignments;
}
