<script lang="ts">
    import { onMount } from "svelte";
    import { m } from "$lib/paraglide/messages";
    import { getLocale, setLocale } from "$lib/paraglide/runtime";
    import { Globe } from "@lucide/svelte";

    let { children } = $props();

    // Force dark mode (mirroring BaseLayout behavior)
    onMount(() => {
        document.documentElement.classList.add("dark");
    });
</script>

<div
    class="selection:bg-brand-gold min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-[#404040] to-[#858585] pb-24 font-sans text-white selection:text-white"
>
    <!-- Content -->
    <main class="relative z-10 w-full">
        <div class="mx-auto max-w-md px-6 pt-8 md:max-w-2xl lg:max-w-4xl">
            <!-- Settings Header -->
            <div class="mb-8 flex items-center justify-between">
                <h1 class="font-serif-tc text-3xl text-white md:text-4xl">
                    {m.settings_title()}
                </h1>

                <button
                    class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
                    onclick={() => {
                        const current = getLocale();
                        const next = current === "en" ? "zh-tw" : "en";
                        setLocale(next);
                    }}
                >
                    <Globe class="h-3.5 w-3.5" />
                    <span class="tracking-wider uppercase">
                        {getLocale() === "en" ? "English" : "繁體中文"}
                    </span>
                </button>
            </div>

            <!-- Content Slot -->
            {@render children?.()}
        </div>
    </main>
</div>
