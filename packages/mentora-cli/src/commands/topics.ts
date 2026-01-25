/**
 * Topics commands
 */
import { Command } from "commander";
import type { MentoraCLIClient } from "../client.js";
import { error, outputData, outputList, success } from "../utils/output.js";

export function createTopicsCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const topics = new Command("topics").description("Manage course topics");

    topics
        .command("list")
        .description("List topics for a course")
        .argument("<courseId>", "Course ID")
        .option("-l, --limit <n>", "Limit number of results", parseInt)
        .action(async (courseId: string, options: { limit?: number }) => {
            const client = await getClient();
            const result = await client.topics.listForCourse(courseId, {
                limit: options.limit,
            });
            if (result.success) {
                outputList(
                    result.data,
                    (topic) =>
                        `${topic.title} (order: ${topic.order}) [${topic.id}]`,
                );
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    topics
        .command("get")
        .description("Get topic details")
        .argument("<topicId>", "Topic ID")
        .action(async (topicId: string) => {
            const client = await getClient();
            const result = await client.topics.get(topicId);
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    topics
        .command("create")
        .description("Create a new topic")
        .requiredOption("--course <courseId>", "Course ID")
        .requiredOption("--title <title>", "Topic title")
        .option("--description <description>", "Topic description")
        .option("--order <n>", "Topic order", parseInt, 0)
        .action(
            async (options: {
                course: string;
                title: string;
                description?: string;
                order: number;
            }) => {
                const client = await getClient();
                const result = await client.topics.create({
                    courseId: options.course,
                    title: options.title,
                    description: options.description || "",
                    order: options.order,
                    contents: [],
                    contentTypes: [],
                });
                if (result.success) {
                    success(`Topic created with ID: ${result.data}`);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    topics
        .command("update")
        .description("Update a topic")
        .argument("<topicId>", "Topic ID")
        .option("--title <title>", "Topic title")
        .option("--description <description>", "Topic description")
        .option("--order <n>", "Topic order", parseInt)
        .action(
            async (
                topicId: string,
                options: {
                    title?: string;
                    description?: string;
                    order?: number;
                },
            ) => {
                const client = await getClient();
                const updates: Record<string, string | number | undefined> = {};
                if (options.title) updates.title = options.title;
                if (options.description !== undefined)
                    updates.description = options.description;
                if (options.order !== undefined) updates.order = options.order;

                if (Object.keys(updates).length === 0) {
                    error("No updates provided.");
                    process.exit(1);
                }

                const result = await client.topics.update(topicId, updates);
                if (result.success) {
                    success("Topic updated successfully.");
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    topics
        .command("delete")
        .description("Delete a topic")
        .argument("<topicId>", "Topic ID")
        .action(async (topicId: string) => {
            const client = await getClient();
            const result = await client.topics.delete(topicId);
            if (result.success) {
                success("Topic deleted successfully.");
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return topics;
}
