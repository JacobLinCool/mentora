<script lang="ts">
    interface Props {
        currentIndex: number;
        totalQuestions: number;
    }

    let { currentIndex, totalQuestions }: Props = $props();

    let stages = $derived(Array.from({ length: totalQuestions }, (_, i) => i));
</script>

<div class="py-4">
    <div class="flex justify-center gap-1.5">
        {#each stages as stage (stage)}
            <div
                class="h-1 max-w-12 flex-1 rounded-full transition-all duration-300 {stage <
                currentIndex
                    ? 'bg-white/50'
                    : stage === currentIndex
                      ? 'bg-white/90'
                      : 'bg-white/20'}"
            ></div>
        {/each}
    </div>
</div>
