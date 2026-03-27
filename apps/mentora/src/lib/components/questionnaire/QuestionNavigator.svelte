<script lang="ts">
    import { ChevronLeft, ChevronRight, Check } from "@lucide/svelte";
    import { m } from "$lib/paraglide/messages";

    interface Props {
        currentIndex: number;
        totalQuestions: number;
        canGoNext: boolean;
        isLastQuestion: boolean;
        onPrev: () => void;
        onNext: () => void;
        onSubmit: () => void;
    }

    let {
        currentIndex,
        totalQuestions,
        canGoNext,
        isLastQuestion,
        onPrev,
        onNext,
        onSubmit,
    }: Props = $props();

    let canGoPrev = $derived(currentIndex > 0);
</script>

<div class="flex items-center justify-between gap-4 py-4">
    {#if canGoPrev}
        <button
            class="student-icon-btn h-12 w-12 active:scale-95"
            onclick={onPrev}
            aria-label={m.questionnaire_prev_question()}
        >
            <ChevronLeft class="h-5 w-5" />
        </button>
    {:else}
        <div class="h-12 w-12 shrink-0"></div>
    {/if}

    <div class="text-sm font-medium text-[#e3e3e3]">
        {currentIndex + 1} / {totalQuestions}
    </div>

    {#if isLastQuestion}
        {#if canGoNext}
            <button
                class="student-icon-btn h-12 w-12 active:scale-95"
                onclick={onSubmit}
                aria-label={m.questionnaire_submit()}
            >
                <Check class="h-5 w-5" />
            </button>
        {:else}
            <div class="h-12 w-12 shrink-0"></div>
        {/if}
    {:else if canGoNext}
        <button
            class="student-icon-btn h-12 w-12 active:scale-95"
            onclick={onNext}
            aria-label={m.questionnaire_next_question()}
        >
            <ChevronRight class="h-5 w-5" />
        </button>
    {:else}
        <div class="h-12 w-12 shrink-0"></div>
    {/if}
</div>
