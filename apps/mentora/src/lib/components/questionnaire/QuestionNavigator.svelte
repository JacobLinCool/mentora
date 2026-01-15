<script lang="ts">
    import { ChevronLeft, ChevronRight, Check } from "@lucide/svelte";

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

<div class="navigator">
    <button
        class="nav-btn prev"
        class:disabled={!canGoPrev}
        onclick={onPrev}
        disabled={!canGoPrev}
    >
        <ChevronLeft class="nav-icon" />
        <span class="nav-text">上一題</span>
    </button>

    <div class="question-counter">
        {currentIndex + 1} / {totalQuestions}
    </div>

    {#if isLastQuestion}
        <button
            class="nav-btn submit"
            class:disabled={!canGoNext}
            onclick={onSubmit}
            disabled={!canGoNext}
        >
            <span class="nav-text">提交</span>
            <Check class="nav-icon" />
        </button>
    {:else}
        <button
            class="nav-btn next"
            class:disabled={!canGoNext}
            onclick={onNext}
            disabled={!canGoNext}
        >
            <span class="nav-text">下一題</span>
            <ChevronRight class="nav-icon" />
        </button>
    {/if}
</div>

<style>
    .navigator {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 0;
    }

    .nav-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .nav-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.25);
    }

    .nav-btn.disabled,
    .nav-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .nav-btn.submit {
        background: rgba(212, 168, 85, 0.2);
        border-color: #d4a855;
        color: #d4a855;
    }

    .nav-btn.submit:hover:not(:disabled) {
        background: rgba(212, 168, 85, 0.3);
    }

    .nav-btn :global(.nav-icon) {
        width: 18px;
        height: 18px;
    }

    .nav-text {
        display: none;
    }

    @media (min-width: 480px) {
        .nav-text {
            display: inline;
        }
    }

    .question-counter {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
    }
</style>
