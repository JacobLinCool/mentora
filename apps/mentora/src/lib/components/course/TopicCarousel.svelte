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
        order: number;
    }

    interface Props {
        topics: Topic[];
        currentIndex?: number;
        onTopicChange?: (index: number) => void;
    }

    let { topics, currentIndex = 0, onTopicChange }: Props = $props();

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
    class="topic-carousel"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    role="region"
    aria-label="Topic carousel"
>
    <!-- Navigation Buttons (Desktop/Tablet) -->
    <button
        class="nav-btn prev"
        onclick={() => changeTopic(activeIndex - 1)}
        disabled={activeIndex === 0}
        aria-label="Previous topic"
    >
        <ChevronsLeft size={32} />
    </button>

    <button
        class="nav-btn next"
        onclick={() => changeTopic(activeIndex + 1)}
        disabled={activeIndex === topics.length - 1}
        aria-label="Next topic"
    >
        <ChevronsRight size={32} />
    </button>

    <!-- Topic Number Badge & List Toggle -->
    <div class="header-row">
        <button class="topic-badge" onclick={() => (showTopicList = true)}>
            TOPIC {String(activeIndex + 1).padStart(2, "0")}
            <List size={14} class="ms-2 opacity-70" />
        </button>
    </div>

    <!-- Topic Title -->
    <h2 class="topic-title">
        {#key currentTopic?.id}
            <span in:fade={{ duration: 300 }}>{currentTopic?.title ?? ""}</span>
        {/key}
    </h2>

    <!-- Topic Description -->
    {#if currentTopic?.description}
        <div class="topic-description">
            <p>{truncatedDescription}</p>

            {#if currentTopic.description.length > 100}
                <button
                    class="expand-toggle"
                    onclick={() =>
                        (isDescriptionExpanded = !isDescriptionExpanded)}
                >
                    {#if isDescriptionExpanded}
                        <span>收起</span>
                        <ChevronUp class="toggle-icon" />
                    {:else}
                        <span>更多</span>
                        <ChevronDown class="toggle-icon" />
                    {/if}
                </button>
            {/if}
        </div>
    {/if}

    <!-- Topic Navigation Dots -->
    <div class="topic-dots">
        {#each topics as topic, index (topic.id)}
            <button
                class="dot {activeIndex === index ? 'active' : ''}"
                onclick={() => changeTopic(index)}
                aria-label="Go to topic {index + 1}"
            ></button>
        {/each}
    </div>

    <!-- Swipe Hint -->
    <p class="swipe-hint">← 左右滑動切換主題 →</p>
</div>

<!-- Topic List Modal -->
{#if showTopicList}
    <div
        class="modal-backdrop"
        transition:fade={{ duration: 200 }}
        onclick={() => (showTopicList = false)}
        role="presentation"
    ></div>
    <div class="topic-list-modal" transition:fly={{ y: 50, duration: 300 }}>
        <div class="modal-header">
            <h3>所有主題</h3>
            <button class="close-btn" onclick={() => (showTopicList = false)}>
                <X size={20} />
            </button>
        </div>
        <div class="topic-list">
            {#each topics as topic, index (topic.id)}
                <button
                    class="topic-item {activeIndex === index ? 'active' : ''}"
                    onclick={() => changeTopic(index)}
                >
                    <span class="topic-num"
                        >{String(index + 1).padStart(2, "0")}</span
                    >
                    <span class="topic-name">{topic.title}</span>
                </button>
            {/each}
        </div>
    </div>
{/if}

<style>
    .topic-carousel {
        padding: 1.5rem;
        user-select: none;
        touch-action: pan-y;
        position: relative;
        overflow: hidden; /* Prevent horizontal scroll from overflow */
    }

    /* iPad responsive padding */
    @media (min-width: 768px) {
        .topic-carousel {
            padding: 2rem 3rem;
        }
    }

    @media (min-width: 1024px) {
        .topic-carousel {
            padding: 2.5rem 4rem;
        }
    }

    .nav-btn {
        position: fixed;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        padding: 1.5rem; /* Larger hit area */
        transition: all 0.2s;
        z-index: 100; /* Higher z-index to sit above content */
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .nav-btn:hover:not(:disabled) {
        color: rgba(255, 255, 255, 0.9);
        transform: translateY(-50%) scale(1.1);
        background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 70%
        ); /* Add subtle glow on hover */
    }

    .nav-btn:disabled {
        opacity: 0; /* Hide completely if disabled to avoid clutter */
        pointer-events: none;
    }

    .nav-btn.prev {
        left: 0;
        padding-left: 1rem;
    }

    .nav-btn.next {
        right: 0;
        padding-right: 1rem;
    }

    /* iPad responsive nav button positioning */
    @media (min-width: 768px) {
        .nav-btn.prev {
            left: 1rem;
            padding-left: 1.5rem;
        }
        .nav-btn.next {
            right: 1rem;
            padding-right: 1.5rem;
        }
    }

    @media (min-width: 1024px) {
        .nav-btn.prev {
            left: 2rem;
        }
        .nav-btn.next {
            right: 2rem;
        }
    }

    .header-row {
        text-align: left;
        margin-bottom: 0.75rem;
    }

    .topic-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.375rem 0.75rem;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.05)
        );
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        backdrop-filter: blur(8px);
        transition: all 0.2s;
    }

    .topic-badge:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
    }

    .topic-title {
        font-size: 2rem;
        font-weight: 700;
        color: #fff;
        margin: 0 0 1rem;
        line-height: 1.2;
        font-family: "Noto Serif TC", serif;
        min-height: 2.4rem; /* Reserve space for transitions */
    }

    .topic-description {
        position: relative;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 1.5rem;
    }

    .topic-description p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.85);
    }

    .expand-toggle {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-top: 0.75rem;
        padding: 0;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.85rem;
        cursor: pointer;
        transition: color 0.2s ease;
    }

    .expand-toggle:hover {
        color: rgba(255, 255, 255, 0.8);
    }

    .expand-toggle :global(.toggle-icon) {
        width: 1rem;
        height: 1rem;
    }

    .topic-dots {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.25);
        border: none;
        padding: 0;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .dot.active {
        background: #fff;
        transform: scale(1.25);
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
    }

    .dot:hover:not(.active) {
        background: rgba(255, 255, 255, 0.5);
    }

    .swipe-hint {
        text-align: center;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.35);
        margin: 0;
    }

    /* Modal Styles */
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 40;
    }

    .topic-list-modal {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #2d2d2d;
        border-top-left-radius: 1.5rem;
        border-top-right-radius: 1.5rem;
        padding: 1.5rem;
        z-index: 50;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* iPad responsive modal - centered with max-width */
    @media (min-width: 768px) {
        .topic-list-modal {
            left: 50%;
            transform: translateX(-50%);
            max-width: 32rem;
            border-radius: 1.5rem;
            bottom: 2rem;
        }
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        color: #fff;
        font-weight: 600;
    }

    .close-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
    }

    .topic-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .topic-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 0.75rem;
        color: rgba(255, 255, 255, 0.8);
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
    }

    .topic-item:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .topic-item.active {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
        color: #fff;
    }

    .topic-num {
        font-family: monospace;
        color: rgba(255, 255, 255, 0.4);
        font-size: 0.875rem;
    }

    .topic-item.active .topic-num {
        color: #ffd700;
    }

    .topic-name {
        font-weight: 500;
    }
</style>
