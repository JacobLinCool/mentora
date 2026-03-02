<script lang="ts">
    import {
        ChevronDown,
        ChevronUp,
        ChevronsLeft,
        ChevronsRight,
        List,
        X,
    } from "@lucide/svelte";
    import { fade, fly } from "svelte/transition";

    interface Topic {
        id: string;
        title: string;
        description: string | null;
        order: number | null;
    }

    interface Props {
        topics: Topic[];
        currentIndex?: number;
        onTopicChange?: (index: number) => void;
    }

    let { topics, currentIndex = 0, onTopicChange }: Props = $props();

    // svelte-ignore state_referenced_locally
    let activeIndex = $state(currentIndex);
    let touchStartX = $state(0);
    let touchEndX = $state(0);
    let isDescriptionExpanded = $state(false);
    let showTopicList = $state(false);

    const SWIPE_THRESHOLD = 50;

    $effect(() => {
        if (currentIndex !== activeIndex) {
            activeIndex = currentIndex;
        }
    });

    function handleTouchStart(e: TouchEvent) {
        touchStartX = e.touches[0].clientX;
    }

    function handleTouchMove(e: TouchEvent) {
        touchEndX = e.touches[0].clientX;
    }

    function handleTouchEnd() {
        if (!touchEndX) return; // No move happened

        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > SWIPE_THRESHOLD) {
            if (diff > 0 && activeIndex < topics.length - 1) {
                // Swipe left - go next
                changeTopic(activeIndex + 1);
            } else if (diff < 0 && activeIndex > 0) {
                // Swipe right - go previous
                changeTopic(activeIndex - 1);
            }
        }
        touchStartX = 0;
        touchEndX = 0;
    }

    function changeTopic(index: number) {
        if (index >= 0 && index < topics.length) {
            activeIndex = index;
            showTopicList = false;
            onTopicChange?.(activeIndex);
        }
    }

    let currentTopic = $derived(topics[activeIndex]);

    // Truncate description for collapsed state
    let truncatedDescription = $derived.by(() => {
        if (!currentTopic?.description) return "";
        if (isDescriptionExpanded || currentTopic.description.length <= 100) {
            return currentTopic.description;
        }
        return currentTopic.description.slice(0, 100) + "...";
    });
</script>

<div
    class="relative touch-pan-y overflow-hidden p-6 select-none md:px-12 md:py-8 lg:px-16 lg:py-10"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    role="region"
    aria-label="Topic carousel"
>
    <!-- Navigation Buttons (Desktop/Tablet) -->
    <button
        class="fixed top-1/2 left-0 z-[100] flex -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent py-6 pr-6 pl-4 text-white/40 transition-all duration-200 hover:text-white/90 disabled:pointer-events-none disabled:opacity-0 md:left-4 md:pl-6 lg:left-8 [&:not(:disabled):hover]:-translate-y-1/2 [&:not(:disabled):hover]:scale-110 [&:not(:disabled):hover]:bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,transparent_70%)]"
        onclick={() => changeTopic(activeIndex - 1)}
        disabled={activeIndex === 0}
        aria-label="Previous topic"
    >
        <ChevronsLeft size={32} />
    </button>

    <button
        class="fixed top-1/2 right-0 z-[100] flex -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent py-6 pr-4 pl-6 text-white/40 transition-all duration-200 hover:text-white/90 disabled:pointer-events-none disabled:opacity-0 md:right-4 md:pr-6 lg:right-8 [&:not(:disabled):hover]:-translate-y-1/2 [&:not(:disabled):hover]:scale-110 [&:not(:disabled):hover]:bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,transparent_70%)]"
        onclick={() => changeTopic(activeIndex + 1)}
        disabled={activeIndex === topics.length - 1}
        aria-label="Next topic"
    >
        <ChevronsRight size={32} />
    </button>

    <!-- Topic Number Badge & List Toggle -->
    <div class="mb-3 text-left">
        <button
            class="inline-flex cursor-pointer items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-widest text-white/80 shadow-black/10 backdrop-blur-md transition-all duration-200 hover:border-white/30 hover:from-white/15 hover:to-white/15"
            onclick={() => (showTopicList = true)}
        >
            TOPIC {String(activeIndex + 1).padStart(2, "0")}
            <List size={14} class="ms-2 opacity-70" />
        </button>
    </div>

    <!-- Topic Title -->
    <h2
        class="font-serif-tc mb-4 min-h-[2.4rem] text-[2rem] leading-[1.2] font-bold text-white"
    >
        {#key currentTopic?.id}
            <span in:fade={{ duration: 300 }}>{currentTopic?.title ?? ""}</span>
        {/key}
    </h2>

    <!-- Topic Description -->
    {#if currentTopic?.description}
        <div class="relative mb-6 rounded-2xl bg-white/10 p-4">
            <p class="m-0 text-[0.95rem] leading-[1.6] text-white/85">
                {truncatedDescription}
            </p>

            {#if currentTopic.description.length > 100}
                <button
                    class="mt-3 flex items-center gap-1 border-none bg-transparent p-0 text-[0.85rem] text-white/50 transition-colors duration-200 hover:text-white/80"
                    onclick={() =>
                        (isDescriptionExpanded = !isDescriptionExpanded)}
                >
                    {#if isDescriptionExpanded}
                        <span>收起</span>
                        <ChevronUp class="h-4 w-4" />
                    {:else}
                        <span>更多</span>
                        <ChevronDown class="h-4 w-4" />
                    {/if}
                </button>
            {/if}
        </div>
    {/if}

    <!-- Topic Navigation Dots -->
    <div class="mb-3 flex justify-center gap-2">
        {#each topics as topic, index (topic.id)}
            <button
                class="h-2 w-2 cursor-pointer rounded-full border-none p-0 transition-all duration-300 {activeIndex ===
                index
                    ? 'scale-125 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                    : 'bg-white/25 hover:bg-white/50'}"
                onclick={() => changeTopic(index)}
                aria-label="Go to topic {index + 1}"
            ></button>
        {/each}
    </div>

    <!-- Swipe Hint -->
    <p class="m-0 text-center text-xs text-white/35">← 左右滑動切換主題 →</p>
</div>

<!-- Topic List Modal -->
{#if showTopicList}
    <div
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-[4px]"
        transition:fade={{ duration: 200 }}
        onclick={() => (showTopicList = false)}
        role="presentation"
    ></div>
    <div
        class="fixed right-0 bottom-0 left-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#2d2d2d] p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] md:right-auto md:bottom-8 md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:rounded-2xl"
        transition:fly={{ y: 50, duration: 300 }}
    >
        <div class="mb-6 flex items-center justify-between">
            <h3 class="m-0 text-xl font-semibold text-white">所有主題</h3>
            <button
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-white/10 text-white/80"
                onclick={() => (showTopicList = false)}
            >
                <X size={20} />
            </button>
        </div>
        <div class="flex flex-col gap-2">
            {#each topics as topic, index (topic.id)}
                <button
                    class="flex cursor-pointer items-center gap-4 rounded-xl p-4 text-left transition-all duration-200 {activeIndex ===
                    index
                        ? 'border-white/30 bg-white/15 text-white'
                        : 'border-white/5 bg-white/5 text-white/80 hover:bg-white/10'}"
                    onclick={() => changeTopic(index)}
                >
                    <span
                        class="font-mono text-sm {activeIndex === index
                            ? 'text-white/100'
                            : 'text-white/40'}"
                        >{String(index + 1).padStart(2, "0")}</span
                    >
                    <span class="font-medium">{topic.title}</span>
                </button>
            {/each}
        </div>
    </div>
{/if}
