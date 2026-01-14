<script lang="ts">
    import { Mic, Keyboard, FileText, FileX } from "@lucide/svelte";

    interface Props {
        showKeywords?: boolean;
        isRecording?: boolean;
        onToggleKeywords?: () => void;
        onToggleRecording?: () => void;
        onShowTextInput?: () => void;
    }

    let {
        showKeywords = false,
        isRecording = false,
        onToggleKeywords,
        onToggleRecording,
        onShowTextInput,
    }: Props = $props();
</script>

<div class="voice-controls">
    <!-- Keywords toggle (left) -->
    <button
        class="control-btn"
        class:active={showKeywords}
        onclick={onToggleKeywords}
        aria-label={showKeywords ? "Hide keywords" : "Show keywords"}
    >
        {#if showKeywords}
            <FileX />
        {:else}
            <FileText />
        {/if}
    </button>

    <!-- Microphone (center) -->
    <button
        class="mic-btn"
        class:recording={isRecording}
        onclick={onToggleRecording}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
        <Mic size={28} />
    </button>

    <!-- Text input toggle (right) -->
    <button
        class="control-btn"
        onclick={onShowTextInput}
        aria-label="Show text input"
    >
        <Keyboard />
    </button>
</div>

<style>
    .voice-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3rem;
        padding: 1rem 0;
    }

    .control-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .control-btn:hover {
        color: white;
    }

    .control-btn.active {
        color: white;
    }

    .mic-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .mic-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.05);
    }

    .mic-btn.recording {
        background: rgba(255, 255, 255, 0.9);
        color: #333;
        box-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
    }
</style>
