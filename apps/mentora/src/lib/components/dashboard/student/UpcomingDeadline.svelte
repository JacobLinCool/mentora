<script lang="ts">
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api } from "$lib/api";
    import { formatMentoraDateTime } from "$lib/features/datetime/format";
    import { openAssignmentTarget } from "$lib/features/course/navigation";
    import { m } from "$lib/paraglide/messages";
    import { ChevronRight } from "@lucide/svelte";
    import posthog from "posthog-js";
    import type { SvelteDate } from "svelte/reactivity";

    import WeekCalendar from "./WeekCalendar.svelte";
    import CountdownTimer from "./CountdownTimer.svelte";

    interface Deadline {
        date: Date;
        course: string;
        assignment: string;
        dueDate: Date;
        assignmentId: string;
        type: string;
        courseId?: string;
    }

    interface Props {
        deadline: Deadline | null;
        deadlineDates?: Date[];
        onDateSelect?: (date: SvelteDate) => void;
    }

    let { deadline, deadlineDates = [], onDateSelect }: Props = $props();

    async function handleEnterAssignment() {
        if (!deadline) return;

        const target = await openAssignmentTarget(api, {
            assignmentId: deadline.assignmentId,
            type: deadline.type,
            courseId: deadline.courseId,
            preferCourseRoute: true,
        });
        if (target) {
            posthog.capture("dashboard_deadline_opened", {
                course_id: deadline.courseId ?? null,
                assignment_id: deadline.assignmentId,
                assignment_type: deadline.type,
            });
            goto(resolve(target.route, target.params));
        }
    }
</script>

<div class="mb-6">
    <WeekCalendar
        selectedDate={deadline?.date}
        {deadlineDates}
        {onDateSelect}
    />

    <div class="mb-4 flex items-center justify-between">
        <h2 class="text-text-primary font-serif-tc text-2xl font-bold">
            {m.dashboard_upcoming_deadline()}
        </h2>
    </div>

    {#if deadline}
        <button
            class="student-panel student-panel-hover student-clickable group mb-4 flex w-full items-center justify-between p-4 text-left active:scale-[0.98]"
            onclick={handleEnterAssignment}
        >
            <div class="flex flex-col gap-1 pr-4">
                <span class="text-lg font-medium text-white"
                    >{deadline.course}</span
                >
                <span class="text-sm text-white/60">{deadline.assignment}</span>
                <span class="text-xs text-white/50">
                    {m.assignments_due()}:
                    {formatMentoraDateTime(deadline.dueDate.getTime())}
                </span>
            </div>

            <div class="flex shrink-0 items-center justify-end gap-3">
                <CountdownTimer targetDate={deadline.dueDate} />
                <ChevronRight
                    class="h-5 w-5 text-white/60 transition group-hover:text-white"
                />
            </div>
        </button>
    {:else}
        <div class="student-panel p-8 text-center">
            <p class="mb-2 text-lg font-medium text-white/80">
                {m.dashboard_no_upcoming_deadline_title()}
            </p>
            <p class="text-sm text-white/50">
                {m.dashboard_no_upcoming_deadline_description()}
            </p>
        </div>
    {/if}
</div>
