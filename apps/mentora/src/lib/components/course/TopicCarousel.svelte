<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { ChevronDown, ChevronUp, List, X } from "@lucide/svelte";
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
            isDescriptionExpanded = false;
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
    class="student-container relative mx-auto max-w-[42rem] touch-pan-y overflow-hidden pt-2 pb-6 select-none lg:max-w-4xl"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    role="region"
    aria-label={m.student_course_topic_carousel_aria()}
>
    {#if currentTopic}
        <div class="mb-4 flex items-center justify-between gap-3">
            <button
                class="student-panel student-panel-hover student-clickable inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-[0.72rem] font-semibold tracking-[0.18em] text-white/72 uppercase"
                onclick={() => (showTopicList = true)}
            >
                {m.student_course_topic_button({
                    number: String(activeIndex + 1).padStart(2, "0"),
                })}
                <List size={14} class="ms-2 opacity-70" />
            </button>
        </div>

        <h2 class="mb-3 text-[1.85rem] leading-[1.18] font-semibold text-white">
            {#key currentTopic.id}
                <span in:fade={{ duration: 250 }}>{currentTopic.title}</span>
            {/key}
        </h2>

        {#if currentTopic.description}
            <div class="max-w-[38rem] py-1">
                <p class="m-0 text-[0.98rem] leading-[1.72] text-white/74">
                    {truncatedDescription}
                </p>

                {#if currentTopic.description.length > 100}
                    <button
                        class="mt-3 inline-flex items-center gap-1 border-none bg-transparent p-0 text-[0.78rem] font-semibold tracking-[0.12em] text-white/46 uppercase transition-colors duration-200 hover:text-white/72"
                        onclick={() =>
                            (isDescriptionExpanded = !isDescriptionExpanded)}
                    >
                        {#if isDescriptionExpanded}
                            <span>{m.student_course_topic_collapse()}</span>
                            <ChevronUp class="h-4 w-4" />
                        {:else}
                            <span>{m.student_course_topic_expand()}</span>
                            <ChevronDown class="h-4 w-4" />
                        {/if}
                    </button>
                {/if}
            </div>
        {/if}

        <div class="mt-5 flex justify-center">
            <div class="flex gap-2">
                {#each topics as topic, index (topic.id)}
                    <button
                        class="h-2.5 w-2.5 cursor-pointer rounded-full border-none p-0 transition-all duration-200 {activeIndex ===
                        index
                            ? 'scale-110 bg-white'
                            : 'bg-white/20 hover:bg-white/38'}"
                        onclick={() => changeTopic(index)}
                        aria-label={m.student_course_topic_dot_aria({
                            number: index + 1,
                        })}
                    ></button>
                {/each}
            </div>
        </div>
    {:else}
        <div class="student-panel rounded-[2rem] p-5">
            <p class="m-0 text-sm leading-relaxed text-white/55">
                {m.student_course_topics_empty()}
            </p>
        </div>
    {/if}
</div>

<!-- Topic List Modal -->
{#if showTopicList}
    <div
        class="fixed inset-0 z-[60] bg-black/55"
        transition:fade={{ duration: 200 }}
        onclick={() => (showTopicList = false)}
        role="presentation"
    ></div>
    <div
        class="student-panel fixed inset-x-4 bottom-[5.75rem] z-[70] max-h-[min(68vh,34rem)] overflow-y-auto rounded-[2rem] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)] md:right-auto md:bottom-8 md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2"
        transition:fly={{ y: 50, duration: 300 }}
    >
        <div class="mb-5 flex items-center justify-between">
            <div>
                <h3 class="m-0 text-xl font-semibold text-white">
                    {m.student_course_topic_list_title()}
                </h3>
                <p class="mt-1 text-sm text-white/44">
                    {m.student_course_topic_list_description()}
                </p>
            </div>
            <button
                class="student-icon-btn h-9 w-9 cursor-pointer rounded-full"
                onclick={() => (showTopicList = false)}
            >
                <X size={20} />
            </button>
        </div>
        <div class="flex flex-col gap-2">
            {#each topics as topic, index (topic.id)}
                <button
                    class="student-panel student-panel-hover student-clickable flex cursor-pointer items-start gap-4 rounded-[1.35rem] p-4 text-left transition-all duration-200 {activeIndex ===
                    index
                        ? 'bg-white/10 text-white'
                        : 'text-white/80'}"
                    onclick={() => changeTopic(index)}
                >
                    <span
                        class="mt-0.5 font-mono text-sm {activeIndex === index
                            ? 'text-white'
                            : 'text-white/40'}"
                        >{String(index + 1).padStart(2, "0")}</span
                    >
                    <span class="min-w-0">
                        <span class="block font-medium">{topic.title}</span>
                    </span>
                </button>
            {/each}
        </div>
    </div>
{/if}
