<script>
    import { m } from "$lib/paraglide/messages";

    import WeekCalendar from "./WeekCalendar.svelte";
    import CountdownTimer from "./CountdownTimer.svelte";

    let { deadline, deadlineDates = [], onDateSelect } = $props();
    // deadline shape: { date: Date, course: string, assignment: string, dueDate: Date }
    // deadlineDates: array of Date objects indicating which dates have deadlines
</script>

<div
    class="mb-6 rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 backdrop-blur-md"
>
    <h2 class="text-text-secondary font-serif-tc mb-4 text-sm tracking-wide">
        {m.dashboard_upcoming_deadline()}
    </h2>

    <WeekCalendar selectedDate={deadline.date} {deadlineDates} {onDateSelect} />

    <div class="mt-4 mb-4">
        <p class="text-text-primary flex items-center">
            <span class="text-xl font-bold">{deadline.course}</span>
            <span class="text-text-secondary mx-2">···</span>
            <span class="text-text-secondary text-sm"
                >{deadline.assignment}</span
            >
        </p>
    </div>

    <CountdownTimer targetDate={deadline.dueDate} />
</div>
