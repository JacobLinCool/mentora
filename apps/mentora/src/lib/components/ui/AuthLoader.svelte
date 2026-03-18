<script lang="ts">
    import { Sparkles } from "@lucide/svelte";
    import { m } from "$lib/paraglide/messages";
</script>

<div
    class="flex h-screen w-full flex-col items-center justify-center bg-[#E5E5E5] text-[#2F2F2F]"
>
    <!-- Animated Logo -->
    <div class="relative mb-8">
        <div
            class="absolute inset-0 animate-ping rounded-full bg-black/6 blur-xl"
        ></div>
        <div
            class="relative flex h-20 w-20 items-center justify-center rounded-full border border-black/8 bg-white shadow-lg"
        >
            <Sparkles class="h-10 w-10 animate-pulse text-[#5F5F5F]" />
        </div>
    </div>

    <!-- Branding -->
    <h1
        class="font-serif-tc mb-3 text-3xl font-bold tracking-tight text-[#2F2F2F]"
    >
        {m.app_name()}
    </h1>

    <!-- Loading indicator -->
    <div class="flex items-center gap-2">
        <div class="flex gap-1">
            <span
                class="h-2 w-2 animate-bounce rounded-full bg-[#6F6F6F]"
                style="animation-delay: 0ms;"
            ></span>
            <span
                class="h-2 w-2 animate-bounce rounded-full bg-[#6F6F6F]"
                style="animation-delay: 150ms;"
            ></span>
            <span
                class="h-2 w-2 animate-bounce rounded-full bg-[#6F6F6F]"
                style="animation-delay: 300ms;"
            ></span>
        </div>
    </div>
</div>
