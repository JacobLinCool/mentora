<script lang="ts">
    interface Props {
        question: string;
        options: string[];
        value?: string;
        onAnswer: (value: string) => void;
    }

    let { question, options, value = "", onAnswer }: Props = $props();

    function handleSelect(option: string) {
        onAnswer(option);
    }
</script>

<div class="single-choice">
    <h2 class="question-text">{question}</h2>

    <div class="options">
        {#each options as option, index (option + "|" + index)}
            <button
                class="option-card"
                class:selected={value === option}
                onclick={() => handleSelect(option)}
            >
                <span class="option-text">{option}</span>
                <div class="option-indicator">
                    {#if value === option}
                        <div class="indicator-fill"></div>
                    {/if}
                </div>
            </button>
        {/each}
    </div>
</div>

<style>
    .single-choice {
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

    .options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .option-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.25rem;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        width: 100%;
    }

    .option-card:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.2);
    }

    .option-card.selected {
        background: rgba(212, 168, 85, 0.15);
        border-color: #d4a855;
        box-shadow: 0 0 12px rgba(212, 168, 85, 0.2);
    }

    .option-text {
        font-size: 1rem;
        color: white;
        font-weight: 400;
    }

    .option-indicator {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: border-color 0.2s ease;
    }

    .option-card.selected .option-indicator {
        border-color: #d4a855;
    }

    .indicator-fill {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #d4a855;
        animation: scaleIn 0.2s ease;
    }

    @keyframes scaleIn {
        from {
            transform: scale(0);
        }
        to {
            transform: scale(1);
        }
    }
</style>
