<script lang="ts">
    import { onMount } from "svelte";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import type { Assignment, Submission } from "$lib/api";
    import { Button, Card, Alert, Spinner, Badge } from "flowbite-svelte";
    import { ClipboardList, Calendar } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";

    type AssignmentWithCourse = Assignment & {
        courseTitle: string;
        submission?: Submission;
    };

    let assignments = $state<AssignmentWithCourse[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    async function loadAssignments() {
        loading = true;
        error = null;

        try {
            // Get all enrolled courses
            const coursesResult = await api.courses.listEnrolled();
            if (!coursesResult.success) {
                console.error(
                    "Failed to list enrolled courses:",
                    coursesResult.error,
                );
                error = coursesResult.error;
                loading = false;
                return;
            }

            const courses = coursesResult.data;
            const assignmentsWithSubmissions: AssignmentWithCourse[] = [];

            // Fetch assignments for each course
            for (const courseDoc of courses) {
                const assignmentsResult = await api.assignments.listForCourse(
                    courseDoc.id,
                );
                if (assignmentsResult.success) {
                    for (const assignment of assignmentsResult.data) {
                        // Try to get submission status
                        const submissionResult = await api.submissions.getMine(
                            assignment.id,
                        );

                        assignmentsWithSubmissions.push({
                            ...assignment,
                            courseTitle: courseDoc.title,
                            submission: submissionResult.success
                                ? submissionResult.data
                                : undefined,
                        });
                    }
                }
            }

            // Sort by due date
            assignments = assignmentsWithSubmissions.sort(
                (a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0),
            );
        } catch (e) {
            error = e instanceof Error ? e.message : "Unknown error";
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        loadAssignments();
    });

    function formatTime(timestamp: number) {
        return new Date(timestamp).toLocaleString();
    }

    function getAssignmentStatus(assignment: AssignmentWithCourse) {
        if (!assignment.submission) {
            return { text: m.assignments_start(), color: "blue" as const };
        }

        switch (assignment.submission.state) {
            case "in_progress":
                return {
                    text: m.assignments_continue(),
                    color: "yellow" as const,
                };
            case "submitted":
            case "graded_complete":
                return {
                    text: m.assignment_detail_submitted(),
                    color: "green" as const,
                };
            default:
                return { text: m.assignments_start(), color: "blue" as const };
        }
    }

    function isOverdue(assignment: AssignmentWithCourse) {
        return (
            (assignment.dueAt ?? 0) < Date.now() &&
            (!assignment.submission ||
                assignment.submission.state === "in_progress")
        );
    }
</script>

<PageHead
    title={m.page_assignments_title()}
    description={m.page_assignments_description()}
/>

<div class="mx-auto max-w-6xl">
    <div class="mb-6 flex items-center gap-3">
        <ClipboardList class="h-8 w-8 text-blue-600" />
        <h1 class="text-3xl font-bold">{m.assignments_title()}</h1>
    </div>

    {#if loading}
        <div class="py-12 text-center">
            <Spinner size="12" />
            <p class="mt-4 text-gray-600">{m.assignments_loading()}</p>
        </div>
    {:else if error}
        <Alert color="red">{m.assignments_error()}: {error}</Alert>
    {:else if assignments.length === 0}
        <Card class=" p-4">
            <p class="py-8 text-center text-gray-600">
                {m.assignments_empty()}
            </p>
        </Card>
    {:else}
        <div class="space-y-4">
            {#each assignments as assignment (assignment.id)}
                {@const status = getAssignmentStatus(assignment)}
                {@const overdue = isOverdue(assignment)}

                <Card
                    class={`p-4 ${overdue ? "border-l-4 border-red-500" : ""}`}
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                            <div class="mb-2 flex items-start gap-2">
                                <h3 class="text-lg font-semibold">
                                    {assignment.title}
                                </h3>
                                {#if overdue}
                                    <Badge color="red">Overdue</Badge>
                                {/if}
                            </div>
                            <p class="mb-2 text-sm text-gray-600">
                                {assignment.courseTitle}
                            </p>
                            <div class="flex gap-4 text-sm text-gray-600">
                                <div class="flex items-center gap-1">
                                    <Calendar class="h-4 w-4" />
                                    <span
                                        >{m.assignments_due()}: {formatTime(
                                            assignment.dueAt ?? 0,
                                        )}</span
                                    >
                                </div>
                                <Badge color="gray">{assignment.mode}</Badge>
                            </div>
                            {#if assignment.submission}
                                <div class="mt-2 text-sm">
                                    <Badge color={status.color}
                                        >{status.text}</Badge
                                    >
                                    {#if assignment.submission.submittedAt}
                                        <span class="ms-2 text-gray-600">
                                            Submitted: {formatTime(
                                                assignment.submission
                                                    .submittedAt,
                                            )}
                                        </span>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        <div class="flex flex-col gap-2">
                            <Button
                                href={`/assignments/${assignment.id}`}
                                size="sm"
                                color={status.color}
                            >
                                {status.text}
                            </Button>
                        </div>
                    </div>
                </Card>
            {/each}
        </div>
    {/if}
</div>
