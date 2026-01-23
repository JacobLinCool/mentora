<script lang="ts">
    import { onMount } from "svelte";

    let { children } = $props();

    // Force dark mode for Flowbite
    onMount(() => {
        document.documentElement.classList.add("dark");
    });
</script>

<div
    class="bg-canvas-deep text-text-primary selection:bg-brand-gold selection:text-canvas-deep dark relative min-h-screen w-full overflow-x-hidden font-sans"
>
    <!-- Living Backdrop -->
    <div class="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <!-- Gradient Base -->
        <div
            class="from-canvas-deep to-canvas-accent absolute inset-0 bg-linear-to-br opacity-90"
        ></div>

        <!-- Floating Orbs -->
        <div
            class="animate-float-delayed absolute -top-[100px] -left-[100px] h-[500px] w-[500px] rounded-full bg-indigo-500/15 blur-[80px]"
        ></div>
    </div>

    <!-- Content Slot -->
    <main class="relative z-10 w-full">
        {@render children?.()}
    </main>
</div>
