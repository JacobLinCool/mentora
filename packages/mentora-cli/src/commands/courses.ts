/**
 * Courses commands
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

export function createCoursesCommand(
    getClient: () => Promise<MentoraCLIClient>,
): Command {
    const courses = new Command("courses").description("Manage courses");

    courses
        .command("list")
        .description("List courses")
        .option("--enrolled", "List courses where I am enrolled as a student")
        .option("--public", "List public courses")
        .option("-l, --limit <n>", "Limit number of results", parseInt)
        .action(
            async (options: {
                enrolled?: boolean;
                public?: boolean;
                limit?: number;
            }) => {
                const client = await getClient();
                let result;

                if (options.public) {
                    result = await client.courses.listPublic({
                        limit: options.limit,
                    });
                } else if (options.enrolled) {
                    result = await client.courses.listEnrolled({
                        limit: options.limit,
                    });
                } else {
                    result = await client.courses.listMine({
                        limit: options.limit,
                    });
                }

                if (result.success) {
                    outputList(
                        result.data,
                        (course) =>
                            `${course.title} (${course.code}) [${course.id}]`,
                    );
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    courses
        .command("get")
        .description("Get course details")
        .argument("<courseId>", "Course ID")
        .action(async (courseId: string) => {
            const client = await getClient();
            const result = await client.courses.get(courseId);
            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    courses
        .command("create")
        .description("Create a new course")
        .argument("<title>", "Course title")
        .argument("<code>", "Course code")
        .action(async (title: string, code: string) => {
            const client = await getClient();
            const result = await client.courses.create(title, code);
            if (result.success) {
                success(`Course created with ID: ${result.data}`);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    courses
        .command("roster")
        .description("Get course roster")
        .argument("<courseId>", "Course ID")
        .option("-l, --limit <n>", "Limit number of results", parseInt)
        .action(async (courseId: string, options: { limit?: number }) => {
            const client = await getClient();
            const result = await client.courses.getRoster(courseId, {
                limit: options.limit,
            });
            if (result.success) {
                outputList(
                    result.data,
                    (member) =>
                        `${member.email} (${member.role}) - Joined: ${formatTimestamp(member.joinedAt)}`,
                );
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return courses;
}
