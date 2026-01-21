<script lang="ts">
    import { onMount } from "svelte";
    import { resolve } from "$app/paths";
    import { api } from "$lib";

    let { children } = $props();

    const user = $derived(api.currentUser);

    // Force dark mode for Flowbite
    onMount(() => {
        document.documentElement.classList.add("dark");
    });

    function getInitials(
        name: string | null | undefined,
        email: string | null | undefined,
    ): string {
        if (name) {
            return name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
        }
        if (email) {
            return email.charAt(0).toUpperCase();
        }
        return "U";
    }
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
