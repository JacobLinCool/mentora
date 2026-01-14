<script>
    import { m } from "$lib/paraglide/messages";
    let { targetDate } = $props();

    let timeRemaining = $state({ days: 0, hours: 0, mins: 0 });

    function calculateTimeRemaining() {
        const now = new Date();
        const target = new Date(targetDate);
        const diff = target.getTime() - now.getTime();

        if (diff > 0) {
            timeRemaining = {
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor(
                    (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
                ),
                mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            };
        } else {
            timeRemaining = { days: 0, hours: 0, mins: 0 };
        }
    }

    // Update every minute
    $effect(() => {
        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 60000);
        return () => clearInterval(interval);
    });
</script>

<div class="grid grid-cols-3 gap-4">
    <div class="bg-text-secondary/20 rounded-2xl p-4 text-center">
        <div class="text-text-primary text-3xl font-bold">
            {String(timeRemaining.days).padStart(2, "0")}
        </div>
        <div class="text-text-secondary font-serif-tc mt-1 text-xs">
            {m.dashboard_days()}
        </div>
    </div>
    <div class="bg-text-secondary/20 rounded-2xl p-4 text-center">
        <div class="text-text-primary text-3xl font-bold">
            {String(timeRemaining.hours).padStart(2, "0")}
        </div>
        <div class="text-text-secondary font-serif-tc mt-1 text-xs">
            {m.dashboard_hours()}
        </div>
    </div>
    <div class="bg-text-secondary/20 rounded-2xl p-4 text-center">
        <div class="text-text-primary text-3xl font-bold">
            {String(timeRemaining.mins).padStart(2, "0")}
        </div>
        <div class="text-text-secondary font-serif-tc mt-1 text-xs">
            {m.dashboard_mins()}
        </div>
    </div>
</div>
