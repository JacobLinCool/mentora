<script lang="ts">
    import { m } from "$lib/paraglide/messages";

    interface Props {
        userName?: string;
    }

    let { userName = m.unknown() }: Props = $props();

    // Get current date
    const now = new Date();
    const days = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
    ];
    const months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
    ];

    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
</script>

<div class="mb-6">
    <p class="text-text-secondary mt-1 mb-2 text-sm tracking-wide uppercase">
        {dayName}, {monthName}
        {date}
    </p>
    <h1 class="font-serif-tc text-3xl font-bold text-white md:text-4xl">
        {m.dashboard_greeting()}，{userName}
    </h1>
</div>
