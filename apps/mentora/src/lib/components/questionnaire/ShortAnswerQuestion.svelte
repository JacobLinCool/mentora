<script lang="ts">
    interface Props {
        question: string;
        placeholder?: string;
        maxLength?: number;
        value?: string;
        onAnswer: (value: string) => void;
    }

    let {
        question,
        placeholder = "輸入您的答案...",
        maxLength,
        value = "",
        onAnswer,
    }: Props = $props();

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        onAnswer(target.value);
    }
</script>

<div class="short-answer">
    <h2 class="question-text">{question}</h2>

    <div class="input-wrapper">
        <textarea
            class="answer-input"
            {placeholder}
            maxlength={maxLength}
            {value}
            oninput={handleInput}
            rows="4"
        ></textarea>
        {#if maxLength}
            <div class="char-count">
                <span class:warning={value.length > maxLength * 0.9}>
                    {value.length}
                </span>
                / {maxLength}
            </div>
        {/if}
    </div>
</div>

<style>
    .short-answer {
        width: 100%;
    }

    .question-text {
        font-family: "Noto Serif TC", serif;
        font-size: 1.75rem;
        font-weight: 400;
        line-height: 1.5;
        color: white;
        margin: 0 0 2rem 0;
    }

    @media (min-width: 768px) {
        .question-text {
            font-size: 2rem;
        }
    }

    .input-wrapper {
        position: relative;
    }

    .answer-input {
        width: 100%;
        padding: 1rem 1.25rem;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: white;
        font-size: 1rem;
        font-family: inherit;
        resize: vertical;
        min-height: 120px;
        transition: all 0.2s ease;
    }

    .answer-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }

    .answer-input:focus {
        outline: none;
        border-color: #d4a855;
        box-shadow: 0 0 12px rgba(212, 168, 85, 0.2);
    }

    .char-count {
        position: absolute;
        bottom: 0.75rem;
        right: 1rem;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.4);
    }

    .char-count .warning {
        color: #f59e0b;
    }
</style>
