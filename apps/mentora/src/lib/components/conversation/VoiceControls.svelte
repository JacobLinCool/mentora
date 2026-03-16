<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { Keyboard, FileText, FileX } from "@lucide/svelte";
    import Record from "./Record.svelte";

    interface Props {
        showUserReplies?: boolean;
        showTextInput?: boolean;
        isRecording?: boolean;
        disabled?: boolean;
        recordDisabled?: boolean;
        textInputDisabled?: boolean;
        onToggleUserReplies?: () => void;
        onShowTextInput?: () => void;
        onRecordingComplete?: (blob: Blob) => void;
    }

    let {
        showUserReplies = false,
        showTextInput = false,
        isRecording = $bindable(false),
        disabled = false,
        recordDisabled = false,
        textInputDisabled = false,
        onToggleUserReplies,
        onShowTextInput,
        onRecordingComplete = () => {},
    }: Props = $props();
</script>

<div class="flex items-center justify-center gap-8 py-4">
    <!-- Keywords toggle (left) -->
    <button
        class="student-icon-btn h-12 w-12 {showUserReplies
            ? 'bg-[#6a6a6a] text-white'
            : 'text-white/72'}"
        onclick={onToggleUserReplies}
        {disabled}
        aria-label={showUserReplies
            ? m.conversation_toggle_user_replies_hide()
            : m.conversation_toggle_user_replies_show()}
    >
        {#if showUserReplies}
            <FileX />
        {:else}
            <FileText />
        {/if}
    </button>

    <!-- Microphone (center) -->
    <Record
        bind:isRecording
        {onRecordingComplete}
        disabled={disabled || recordDisabled}
    />

    <!-- Text input toggle (right) -->
    <button
        class="student-icon-btn h-12 w-12 {showTextInput
            ? 'bg-[#6a6a6a] text-white'
            : 'text-white/72'}"
        onclick={onShowTextInput}
        disabled={disabled || textInputDisabled}
        aria-label={showTextInput
            ? m.conversation_toggle_text_input_hide()
            : m.conversation_toggle_text_input_show()}
    >
        <Keyboard />
    </button>
</div>
