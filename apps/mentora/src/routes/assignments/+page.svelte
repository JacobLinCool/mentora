<script lang="ts">
    import { onMount } from "svelte";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import type { Assignment, Submission } from "$lib/api";
    import { ClipboardList, Calendar, ClipboardCheck } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import StatusBadge from "$lib/components/ui/StatusBadge.svelte";

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
        return new Date(timestamp).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getAssignmentStatus(
        assignment: AssignmentWithCourse,
    ): "active" | "success" | "warning" | "error" {
        if (!assignment.submission) {
            return "active"; // Not started
        }

        switch (assignment.submission.state) {
            case "in_progress":
                return "warning";
            case "submitted":
            case "graded_complete":
                return "success";
            default:
                return "active";
        }
    }

    function getStatusLabel(assignment: AssignmentWithCourse) {
        if (!assignment.submission) return m.assignments_start();
        switch (assignment.submission.state) {
            case "in_progress":
                return m.assignments_continue();
            case "submitted":
                return m.assignment_detail_submitted();
            case "graded_complete":
                return "Graded";
            default:
                return m.assignments_start();
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

<BaseLayout>
    <div class="container mx-auto max-w-7xl px-4 py-8">
        <div class="mb-12 flex items-center justify-between">
            <div>
                <div
                    class="text-text-secondary mb-2 text-sm font-medium tracking-wide uppercase"
                >
                    My Tasks
                </div>
                <h1
                    class="flex items-center gap-3 font-serif text-4xl text-white"
                >
                    <ClipboardList class="text-brand-gold h-8 w-8" />
                    {m.assignments_title()}
                </h1>
            </div>
        </div>

        {#if loading}
            <div class="flex flex-col items-center py-24 text-center">
                <div
                    class="border-brand-gold/30 border-t-brand-gold mb-4 h-12 w-12 animate-spin rounded-full border-4"
                ></div>
                <p class="text-text-secondary animate-pulse tracking-wide">
                    {m.assignments_loading()}
                </p>
            </div>
        {:else if error}
            <GlassCard className="border-status-error/50 bg-status-error/10">
                <div class="py-8 text-center">
                    <p class="text-status-error mb-2 text-lg font-bold">
                        {m.assignments_error()}
                    </p>
                    <p class="text-white/70">{error}</p>
                </div>
            </GlassCard>
        {:else if assignments.length === 0}
            <GlassCard>
                <div class="py-16 text-center">
                    <div
                        class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5"
                    >
                        <ClipboardCheck class="text-text-secondary h-10 w-10" />
                    </div>
                    <h3 class="mb-2 font-serif text-2xl text-white">
                        All Caught Up
                    </h3>
                    <p class="text-text-secondary mx-auto max-w-md">
                        {m.assignments_empty()}
                    </p>
                </div>
            </GlassCard>
        {:else}
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {#each assignments as assignment (assignment.id)}
                    {@const status = getAssignmentStatus(assignment)}
                    {@const statusLabel = getStatusLabel(assignment)}
                    {@const overdue = isOverdue(assignment)}

                    <GlassCard
                        className={`group hover:border-brand-gold/30 transition-all duration-300 relative overflow-hidden flex flex-col h-full ${overdue ? "!border-status-error/40" : ""}`}
                    >
                        <!-- Overdue Indicator -->
                        {#if overdue}
                            <div
                                class="pointer-events-none absolute top-0 right-0 h-16 w-16 overflow-hidden"
                            >
                                <div
                                    class="bg-status-error absolute top-0 right-0 translate-x-4 translate-y-2 rotate-45 px-8 py-1 text-[10px] font-bold text-white shadow-lg"
                                >
                                    OVERDUE
                                </div>
                            </div>
                        {/if}

                        <div class="mb-4 flex items-start justify-between">
                            <StatusBadge {status}>{statusLabel}</StatusBadge>
                            <span
                                class="text-text-secondary rounded border border-white/10 px-2 py-1 font-mono text-xs"
                            >
                                {assignment.mode.toUpperCase()}
                            </span>
                        </div>

                        <h3
                            class="group-hover:text-brand-gold mb-2 line-clamp-2 min-h-[4rem] font-serif text-2xl text-white transition-colors"
                        >
                            {assignment.title}
                        </h3>

                        <p
                            class="text-brand-silver mb-6 flex items-center gap-2 text-sm"
                        >
                            <span
                                class="bg-brand-gold/50 inline-block h-2 w-2 rounded-full"
                            ></span>
                            {assignment.courseTitle}
                        </p>

                        <div class="mt-auto space-y-4">
                            <div
                                class="text-text-secondary flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-sm"
                            >
                                <Calendar class="text-brand-gold/70 h-4 w-4" />
                                <div class="flex flex-col">
                                    <span
                                        class="text-text-secondary/60 text-[10px] tracking-wider uppercase"
                                        >{m.assignments_due()}</span
                                    >
                                    <span class="font-mono text-white/90"
                                        >{formatTime(
                                            assignment.dueAt ?? 0,
                                        )}</span
                                    >
                                </div>
                            </div>

                            <CosmicButton
                                href={`/assignments/${assignment.id}`}
                                variant={status === "success"
                                    ? "secondary"
                                    : "primary"}
                                className="w-full justify-center"
                            >
                                {status === "active"
                                    ? m.assignments_start()
                                    : status === "warning"
                                      ? m.assignments_continue()
                                      : "View Details"}
                            </CosmicButton>
                        </div>
                    </GlassCard>
                {/each}
            </div>
        {/if}
    </div>
</BaseLayout>```
