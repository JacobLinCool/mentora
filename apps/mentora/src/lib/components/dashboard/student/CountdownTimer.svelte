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

<div class="flex items-center gap-3">
    <div class="flex flex-col items-center">
        <div class="text-text-primary text-xl leading-none font-bold">
            {String(timeRemaining.days).padStart(2, "0")}
        </div>
        <div class="text-text-secondary mt-0.5 text-[10px]">
            {m.dashboard_days()}
        </div>
    </div>
    <div class="mb-3 text-xl font-light text-white/20">:</div>
    <div class="flex flex-col items-center">
        <div class="text-text-primary text-xl leading-none font-bold">
            {String(timeRemaining.hours).padStart(2, "0")}
        </div>
        <div class="text-text-secondary mt-0.5 text-[10px]">
            {m.dashboard_hours()}
        </div>
    </div>
    <div class="mb-3 text-xl font-light text-white/20">:</div>
    <div class="flex flex-col items-center">
        <div class="text-text-primary text-xl leading-none font-bold">
            {String(timeRemaining.mins).padStart(2, "0")}
        </div>
        <div class="text-text-secondary mt-0.5 text-[10px]">
            {m.dashboard_mins()}
        </div>
    </div>
</div>
