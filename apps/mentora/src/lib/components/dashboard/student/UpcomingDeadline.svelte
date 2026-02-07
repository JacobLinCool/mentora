<script>
    import { m } from "$lib/paraglide/messages";

    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api } from "$lib/api";

    import WeekCalendar from "./WeekCalendar.svelte";
    import CountdownTimer from "./CountdownTimer.svelte";

    let { deadline, deadlineDates = [], onDateSelect } = $props();
    // deadline shape: { date: Date, course: string, assignment: string, dueDate: Date, assignmentId: string, type: string, courseId: string }

    async function handleEnterAssignment() {
        if (!deadline) return;

        // Navigate to course page instead of direct assignment/conversation
        if (deadline.courseId) {
            goto(resolve(`/courses/${deadline.courseId}`));
            return;
        }

        // Fallback or explicit assignment nav if no courseId (shouldn't happen for course assignments)
        if (deadline.type === "questionnaire") {
            goto(resolve(`/questionnaires/${deadline.assignmentId}`));
            return;
        }

        // Try conversation
        try {
            const convRes = await api.conversations.getForAssignment(
                deadline.assignmentId,
            );
            if (convRes.success && convRes.data.id) {
                goto(resolve(`/conversations/${convRes.data.id}`));
                return;
            }

            // Create
            const createRes = await api.conversations.create(
                deadline.assignmentId,
            );
            if (createRes.success && createRes.data.id) {
                await api.submissions.start(deadline.assignmentId);
                goto(resolve(`/conversations/${createRes.data.id}`));
            }
        } catch (e) {
            console.error("Route error", e);
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
