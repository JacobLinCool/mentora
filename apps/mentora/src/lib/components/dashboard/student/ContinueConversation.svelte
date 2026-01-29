<script>
    import { m } from "$lib/paraglide/messages";

    let { onclick, title = "" } = $props();
    const conversationTitle = m.dashboard_continue_conversation();
</script>

<div class="relative mb-6">
    <button
        class="relative flex h-32 w-full items-center justify-center transition-transform hover:scale-[1.01] active:scale-[0.98]"
        {onclick}
    >
        <!-- Radial gradient circular background - very small and bright -->
        <div
            class="pointer-events-none absolute inset-0 flex items-center justify-center"
            style="background: radial-gradient(circle at center, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 15%, transparent 25%);"
        ></div>

        <!-- Text content -->
        <div
            class="text-text-primary font-serif-tc relative z-10 flex flex-col items-center gap-1 text-lg font-medium"
        >
            <p>{conversationTitle}</p>
            {#if title}
                <p class="text-sm opacity-80">{title}</p>
            {/if}
        </div>
    </button>
</div>
