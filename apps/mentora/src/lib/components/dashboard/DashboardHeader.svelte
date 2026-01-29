<script>
    import { m } from "$lib/paraglide/messages";
    let { userName = "user01" } = $props();

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
    <p class="text-text-secondary text-sm tracking-wide uppercase">
        {dayName}, {monthName}
        {date}
    </p>
    <h1 class="text-text-primary font-serif-tc mt-1 text-3xl font-bold">
        {m.dashboard_greeting()}，{userName}
    </h1>
</div>
