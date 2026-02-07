<script lang="ts">
    import { Keyboard, FileText, FileX } from "@lucide/svelte";
    import Record from "./Record.svelte";

    interface Props {
        showKeywords?: boolean;
        isRecording?: boolean;
        onToggleKeywords?: () => void;
        onShowTextInput?: () => void;
        onRecordingComplete?: (blob: Blob) => void;
    }

    let {
        showKeywords = false,
        isRecording = $bindable(false),
        onToggleKeywords,
        onShowTextInput,
        onRecordingComplete = () => {},
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
    <Record bind:isRecording {onRecordingComplete} />

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
</style>
