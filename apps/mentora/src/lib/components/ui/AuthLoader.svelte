<script lang="ts">
    import { Sparkles } from "@lucide/svelte";
    import { m } from "$lib/paraglide/messages";
</script>

<div
    class="bg-canvas-deep flex h-screen w-full flex-col items-center justify-center"
>
    <!-- Animated Logo -->
    <div class="relative mb-8">
        <div
            class="absolute inset-0 animate-ping rounded-full bg-white/10 blur-xl"
        ></div>
        <div
            class="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-linear-to-br from-[#7f7f7f] to-[#b3b3b3] shadow-lg"
        >
            <Sparkles class="h-10 w-10 animate-pulse text-white" />
        </div>
    </div>

    <!-- Branding -->
    <h1
        class="bg-background-image-metallic mb-3 bg-clip-text font-serif text-3xl font-bold tracking-tight text-transparent"
    >
        {m.app_name()}
    </h1>

    <!-- Loading indicator -->
    <div class="flex items-center gap-2">
        <div class="flex gap-1">
            <span
                class="h-2 w-2 animate-bounce rounded-full bg-white/70"
                style="animation-delay: 0ms;"
            ></span>
            <span
                class="h-2 w-2 animate-bounce rounded-full bg-white/70"
                style="animation-delay: 150ms;"
            ></span>
            <span
                class="h-2 w-2 animate-bounce rounded-full bg-white/70"
                style="animation-delay: 300ms;"
            ></span>
        </div>
    </div>
</div>
