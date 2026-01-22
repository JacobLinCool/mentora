<script lang="ts">
    import { onMount } from "svelte";
    import { m } from "$lib/paraglide/messages";

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
            <div class="mb-8">
                <h1 class="font-serif-tc text-3xl text-white md:text-4xl">
                    {m.settings_title()}
                </h1>
            </div>

            <!-- Content Slot -->
            {@render children?.()}
        </div>
    </main>
</div>
