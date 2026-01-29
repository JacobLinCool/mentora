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

    courses
        .command("update")
        .description("Update a course")
        .argument("<courseId>", "Course ID")
        .option("--title <title>", "Course title")
        .option(
            "--visibility <visibility>",
            "Visibility (public/unlisted/private)",
        )
        .option("--description <description>", "Course description")
        .action(
            async (
                courseId: string,
                options: {
                    title?: string;
                    visibility?: string;
                    description?: string;
                },
            ) => {
                const client = await getClient();
                const updates: Record<string, string | undefined> = {};
                if (options.title) updates.title = options.title;
                if (options.visibility) updates.visibility = options.visibility;
                if (options.description)
                    updates.description = options.description;

                if (Object.keys(updates).length === 0) {
                    error("No updates provided.");
                    process.exit(1);
                }

                const result = await client.courses.update(courseId, updates);
                if (result.success) {
                    success("Course updated successfully.");
                    outputData(result.data);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    courses
        .command("delete")
        .description("Delete a course")
        .argument("<courseId>", "Course ID")
        .action(async (courseId: string) => {
            const client = await getClient();
            const result = await client.courses.delete(courseId);
            if (result.success) {
                success("Course deleted successfully.");
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    courses
        .command("invite")
        .description("Invite a member to a course")
        .argument("<courseId>", "Course ID")
        .argument("<email>", "Email to invite")
        .option("--role <role>", "Role (instructor/member)", "member")
        .action(
            async (
                courseId: string,
                email: string,
                options: { role: string },
            ) => {
                const client = await getClient();
                const result = await client.courses.inviteMember(
                    courseId,
                    email,
                    options.role as "instructor" | "student" | "ta" | "auditor",
                );
                if (result.success) {
                    success(`Invited ${email} to course as ${options.role}.`);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    courses
        .command("wallet")
        .description("Get course wallet (host wallet)")
        .argument("<courseId>", "Course ID")
        .option("--ledger", "Include ledger entries")
        .action(async (courseId: string, options: { ledger?: boolean }) => {
            const client = await getClient();
            const result = await client.courses.getWallet(courseId, {
                includeLedger: options.ledger,
            });

            if (result.success) {
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    courses
        .command("copy")
        .description("Copy a course")
        .argument("<courseId>", "Source Course ID")
        .option("--title <title>", "New course title")
        .option("--no-content", "Skip copying content (topics, assignments)")
        .option("--roster", "Include roster (instructors/TAs)")
        .action(
            async (
                courseId: string,
                options: {
                    title?: string;
                    content: boolean;
                    roster?: boolean;
                },
            ) => {
                const client = await getClient();
                const result = await client.courses.copy(courseId, {
                    title: options.title,
                    includeContent: options.content,
                    includeRoster: options.roster,
                });
                if (result.success) {
                    success(`Course copied. New ID: ${result.data}`);
                } else {
                    error(result.error);
                    process.exit(1);
                }
            },
        );

    courses
        .command("announce")
        .description("Post an announcement")
        .argument("<courseId>", "Course ID")
        .argument("<content>", "Announcement content")
        .action(async (courseId: string, content: string) => {
            const client = await getClient();
            const result = await client.courses.createAnnouncement(
                courseId,
                content,
            );
            if (result.success) {
                success("Announcement posted.");
                outputData(result.data);
            } else {
                error(result.error);
                process.exit(1);
            }
        });

    return courses;
}
