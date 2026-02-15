<script lang="ts">
    import { m } from "$lib/paraglide/messages";

    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api } from "$lib/api";
    import { openAssignmentTarget } from "$lib/features/course/navigation";
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
            goto(resolve(target.route, target.params));
        }
    }
</script>

<div
    class="mb-6 rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 backdrop-blur-md"
>
    <h2 class="text-text-secondary font-serif-tc mb-4 text-sm tracking-wide">
        {m.dashboard_upcoming_deadline()}
    </h2>

    <WeekCalendar
        selectedDate={deadline?.date}
        {deadlineDates}
        {onDateSelect}
    />

    {#if deadline}
        <div class="mt-4 mb-4">
            <button
                class="text-text-primary flex w-full cursor-pointer items-center text-left transition-opacity hover:opacity-80"
                onclick={handleEnterAssignment}
            >
                <span class="text-xl font-bold">{deadline.course}</span>
                <span class="text-text-secondary mx-2">···</span>
                <span class="text-text-secondary text-sm"
                    >{deadline.assignment}</span
                >
            </button>
        </div>

        <CountdownTimer targetDate={deadline.dueDate} />
    {:else}
        <div
            class="flex h-48 flex-col items-center justify-center text-center text-white/50"
        >
            <p class="mb-2 text-lg font-medium">No upcoming deadlines</p>
            <p class="text-sm">You are all caught up!</p>
        </div>
    {/if}
</div>
