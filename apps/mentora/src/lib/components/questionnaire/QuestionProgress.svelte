<script lang="ts">
    interface Props {
        currentIndex: number;
        totalQuestions: number;
    }

    let { currentIndex, totalQuestions }: Props = $props();

    let stages = $derived(Array.from({ length: totalQuestions }, (_, i) => i));
</script>

<div class="progress-container">
    <div class="progress-bar">
        {#each stages as stage (stage)}
            <div
                class="progress-segment"
                class:completed={stage < currentIndex}
                class:current={stage === currentIndex}
            ></div>
        {/each}
    </div>
</div>

<style>
    .progress-container {
        padding: 1rem 0;
    }

    .progress-bar {
        display: flex;
        gap: 6px;
        justify-content: center;
    }

    .progress-segment {
        flex: 1;
        max-width: 48px;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
    }

    .progress-segment.completed {
        background: rgba(255, 255, 255, 0.5);
    }

    .progress-segment.current {
        background: #d4a855;
        box-shadow: 0 0 8px rgba(212, 168, 85, 0.5);
    }
</style>
