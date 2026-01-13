<script lang="ts">
    interface Props {
        currentStage: number;
        totalStages: number;
    }

    let { currentStage, totalStages }: Props = $props();

    // Generate array for stages
    let stages = $derived(Array.from({ length: totalStages }, (_, i) => i));
</script>

<div class="stage-indicator">
    {#each stages as stage}
        <div
            class="stage-segment"
            class:completed={stage < currentStage}
            class:current={stage === currentStage}
        ></div>
    {/each}
</div>

<style>
    .stage-indicator {
        display: flex;
        gap: 8px;
        justify-content: center;
        padding: 16px 24px;
    }

    .stage-segment {
        width: 48px;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
    }

    .stage-segment.completed {
        background: rgba(255, 255, 255, 0.4);
    }

    .stage-segment.current {
        background: #d4a855;
        box-shadow: 0 0 8px rgba(212, 168, 85, 0.5);
    }
</style>
