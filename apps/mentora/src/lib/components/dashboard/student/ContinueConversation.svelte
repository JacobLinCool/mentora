<script>
    import { ChevronRight, MessageSquare } from "@lucide/svelte";
    import { m } from "$lib/paraglide/messages";

    let { onclick, title = "" } = $props();
    const conversationTitle = m.dashboard_continue_conversation();
</script>

<div class="relative mb-6">
    <button
        class="student-panel student-panel-hover student-clickable relative flex min-h-[5.5rem] w-full items-center gap-3 overflow-hidden rounded-[1.75rem] px-4 py-4 text-left active:scale-[0.98]"
        {onclick}
    >
        <div
            class="pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-white/5 to-transparent"
        ></div>

        <div
            class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center"
        >
            <MessageSquare class="h-4.5 w-4.5 text-white/75" />
        </div>

        <div class="relative z-10 min-w-0 flex-1">
            <p
                class="mb-1 text-[0.68rem] font-semibold tracking-[0.18em] text-white/40 uppercase"
            >
                {m.conversation_title()}
            </p>
            <p class="m-0 text-[1.15rem] leading-none font-semibold text-white">
                {conversationTitle}
            </p>
            {#if title}
                <p class="mt-2 mb-0 truncate text-[0.92rem] text-white/60">
                    {title}
                </p>
            {/if}
        </div>

        <div
            class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/8"
        >
            <ChevronRight class="h-4.5 w-4.5 text-white/55" />
        </div>
    </button>
</div>
