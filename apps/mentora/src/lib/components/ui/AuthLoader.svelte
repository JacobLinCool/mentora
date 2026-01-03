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
            class="bg-brand-gold/20 absolute inset-0 animate-ping rounded-full blur-xl"
        ></div>
        <div
            class="from-brand-gold to-brand-silver relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br shadow-lg"
        >
            <Sparkles class="h-10 w-10 animate-pulse text-black" />
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
                class="bg-brand-gold h-2 w-2 animate-bounce rounded-full"
                style="animation-delay: 0ms;"
            ></span>
            <span
                class="bg-brand-gold h-2 w-2 animate-bounce rounded-full"
                style="animation-delay: 150ms;"
            ></span>
            <span
                class="bg-brand-gold h-2 w-2 animate-bounce rounded-full"
                style="animation-delay: 300ms;"
            ></span>
        </div>
    </div>
</div>
