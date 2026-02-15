<script lang="ts">
    interface Props {
        question: string;
        minLabel: string;
        maxLabel: string;
        minValue: number;
        maxValue: number;
        step: number;
        value: number | null;
        onAnswer: (value: number) => void;
    }

    let {
        question,
        minLabel,
        maxLabel,
        minValue,
        maxValue,
        step,
        value = null,
        onAnswer,
    }: Props = $props();

    let currentValue = $derived(value ?? minValue);

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const num = Number(target.value);
        onAnswer(num);
    }
</script>

<div class="slider-question">
    <h2 class="question-text">{question}</h2>

    <div class="slider-container">
        <div class="slider-value">{currentValue}</div>

        <input
            type="range"
            class="slider-input"
            min={minValue}
            max={maxValue}
            {step}
            value={currentValue}
            oninput={handleInput}
        />

        <div class="slider-labels">
            <span class="slider-label">{minLabel}</span>
            <span class="slider-label">{maxLabel}</span>
        </div>
    </div>
</div>

<style>
    .slider-question {
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

    .slider-container {
        padding: 1.5rem 1.25rem;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
    }

    .slider-value {
        text-align: center;
        font-size: 2rem;
        font-weight: 600;
        color: #d4a855;
        margin-bottom: 1.25rem;
    }

    .slider-input {
        width: 100%;
        height: 6px;
        appearance: none;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
    }

    .slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #d4a855;
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: box-shadow 0.2s ease;
    }

    .slider-input::-webkit-slider-thumb:hover {
        box-shadow: 0 0 12px rgba(212, 168, 85, 0.4);
    }

    .slider-input::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #d4a855;
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: box-shadow 0.2s ease;
    }

    .slider-input::-moz-range-thumb:hover {
        box-shadow: 0 0 12px rgba(212, 168, 85, 0.4);
    }

    .slider-input::-moz-range-track {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
        height: 6px;
    }

    .slider-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 0.75rem;
    }

    .slider-label {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.6);
    }
</style>
