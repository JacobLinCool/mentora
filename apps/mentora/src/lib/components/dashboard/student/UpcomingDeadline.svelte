<script lang="ts">
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

<div class="mb-6">
    <div class="mb-6">
        <WeekCalendar
            selectedDate={deadline?.date}
            {deadlineDates}
            {onDateSelect}
        />
    </div>

    {#if deadline}
        <button
            class="group mb-4 flex w-full cursor-pointer items-center justify-between rounded-2xl bg-white/10 p-4 text-left shadow-lg shadow-black/10 backdrop-blur-md transition-all active:translate-y-0 active:scale-[0.98]"
            onclick={handleEnterAssignment}
        >
            <div class="flex flex-col gap-1 pr-4">
                <span class="text-lg font-medium text-white"
                    >{deadline.course}</span
                >
                <span class="text-sm text-white/60">{deadline.assignment}</span>
            </div>

            <div class="flex shrink-0 items-center justify-end">
                <CountdownTimer targetDate={deadline.dueDate} />
            </div>
        </button>
    {:else}
        <div
            class="rounded-2xl border border-white/10 bg-[#4C4C4C] p-8 text-center shadow-sm backdrop-blur-md"
        >
            <p class="mb-2 text-lg font-medium text-white/80">
                No upcoming deadlines
            </p>
            <p class="text-sm text-white/50">You are all caught up!</p>
        </div>
    {/if}
</div>
