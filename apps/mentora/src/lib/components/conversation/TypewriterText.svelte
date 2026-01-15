<script lang="ts">
    interface Props {
        text: string;
        speed?: number;
        onComplete?: () => void;
    }

    let { text, speed = 50, onComplete }: Props = $props();

    let displayedText = $state("");
    let showCursor = $state(true);
    let isComplete = $state(false);

    // Cursor blink effect
    $effect(() => {
        const interval = setInterval(() => {
            showCursor = !showCursor;
        }, 530);
        return () => clearInterval(interval);
    });

    // Typing effect
    $effect(() => {
        displayedText = "";
        isComplete = false;
        let index = 0;

        const interval = setInterval(() => {
            if (index < text.length) {
                displayedText = text.slice(0, index + 1);
                index++;
            } else {
                clearInterval(interval);
                isComplete = true;
                onComplete?.();
            }
        }, speed);

        return () => clearInterval(interval);
    });
</script>

<div class="typewriter">
    <span class="text">{displayedText}</span>
    {#if !isComplete || showCursor}
        <span class="cursor" class:blink={isComplete}>|</span>
    {/if}
</div>

<style>
    .typewriter {
        font-family: "Noto Serif TC", "Times New Roman", serif;
        font-size: 1.75rem;
        font-weight: 400;
        line-height: 1.6;
        color: white;
    }

    .text {
        white-space: pre-wrap;
    }

    .cursor {
        color: white;
        font-weight: 300;
        margin-left: 2px;
    }

    .cursor.blink {
        animation: blink 1.06s step-end infinite;
    }

    @keyframes blink {
        0%,
        50% {
            opacity: 1;
        }
        50.01%,
        100% {
            opacity: 0;
        }
    }
</style>
