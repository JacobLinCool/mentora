<script lang="ts">
    import { page } from "$app/state";
    import { m } from "$lib/paraglide/messages";
    import { Send } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import TypewriterText from "$lib/components/conversation/TypewriterText.svelte";
    import KeywordsPanel from "$lib/components/conversation/KeywordsPanel.svelte";
    import VoiceControls from "$lib/components/conversation/VoiceControls.svelte";
    import StageIndicator from "$lib/components/conversation/StageIndicator.svelte";

    const conversationId = $derived(page.params.id);

    // UI State
    type Phase = "responding" | "ready";
    let phase: Phase = $state("responding");
    let typingPhase: "response" | "question" = $state("response"); // Which part is being typed
    let showKeywords = $state(false);
    let showTextInput = $state(false);
    let isRecording = $state(false);
    let currentStage = $state(2); // Mock: current stage index (0-based)
    let totalStages = $state(5); // Mock: total stages

    // Mock data for demo - separate response and question
    let currentResponse = $state(
        "You seem to be liking your personal experience directly...",
    );
    let currentQuestion = $state(
        "What leads you to believe this assumption is true?",
    );
    let keywords = $state([
        "Bias",
        "Intuition",
        "Evidence",
        "Personal Experience",
        "Data",
    ]);

    let messageInput = $state("");
    let sending = $state(false);

    function handleResponseComplete() {
        // After response finishes, start typing the question
        setTimeout(() => {
            typingPhase = "question";
        }, 300);
    }

    function handleQuestionComplete() {
        // Transition to ready phase after question completes
        setTimeout(() => {
            phase = "ready";
        }, 500);
    }

    function handleToggleKeywords() {
        showKeywords = !showKeywords;
    }

    function handleToggleRecording() {
        isRecording = !isRecording;
    }

    function handleShowTextInput() {
        showTextInput = !showTextInput;
    }

    async function handleSendMessage() {
        if (!messageInput.trim()) return;

        sending = true;

        // Mock sending - just simulate response
        setTimeout(() => {
            messageInput = "";
            showTextInput = false;
            // Reset to responding phase for next turn
            phase = "responding";
            typingPhase = "response";
            sending = false;
        }, 500);
    }
</script>

<PageHead
    title={m.page_conversation_title()}
    description={m.page_conversation_description()}
/>

<div class="conversation-container">
    <!-- Background gradient -->
    <div class="background"></div>

    <!-- Main content -->
    <div class="content">
        <!-- Phase 1: LLM Responding with typing effect -->
        {#if phase === "responding"}
            <div class="responding-phase">
                <div class="text-container">
                    {#if typingPhase === "response"}
                        <!-- Show response first -->
                        <TypewriterText
                            text={currentResponse}
                            speed={50}
                            onComplete={handleResponseComplete}
                        />
                    {:else}
                        <!-- Show both response (static) + question (typing) -->
                        <p class="response-text">{currentResponse}</p>
                        <div class="question-typing">
                            <TypewriterText
                                text={currentQuestion}
                                speed={50}
                                onComplete={handleQuestionComplete}
                            />
                        </div>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- Phase 2: Ready for user input (only show question) -->
        {#if phase === "ready"}
            <div class="ready-phase">
                <!-- Question at top (only the question, not response) -->
                <div class="question-section">
                    <h1 class="question-text">{currentQuestion}</h1>
                </div>

                <!-- Keywords panel (middle) -->
                {#if showKeywords}
                    <div class="keywords-section">
                        <KeywordsPanel {keywords} visible={showKeywords} />
                    </div>
                {/if}

                <!-- Spacer -->
                <div class="spacer"></div>

                <!-- Text input (when visible) -->
                {#if showTextInput}
                    <div class="text-input-section">
                        <div class="input-wrapper">
                            <textarea
                                bind:value={messageInput}
                                placeholder={m.conversation_placeholder()}
                                rows="2"
                                disabled={sending}
                            ></textarea>
                            <button
                                class="send-btn"
                                onclick={handleSendMessage}
                                disabled={sending || !messageInput.trim()}
                            >
                                <Send class="send-icon" />
                            </button>
                        </div>
                    </div>
                {/if}

                <!-- Voice controls -->
                <div class="controls-section">
                    <VoiceControls
                        {showKeywords}
                        {isRecording}
                        onToggleKeywords={handleToggleKeywords}
                        onToggleRecording={handleToggleRecording}
                        onShowTextInput={handleShowTextInput}
                    />
                </div>

                <!-- Stage indicator -->
                <div class="stage-section">
                    <StageIndicator {currentStage} {totalStages} />
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .conversation-container {
        position: fixed;
        inset: 0;
        overflow: hidden;
    }

    .background {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            135deg,
            #5a5a5a 0%,
            #3a3a3a 50%,
            #4a4a4a 100%
        );
        z-index: -1;
    }

    .background::before {
        content: "";
        position: absolute;
        top: -20%;
        left: -10%;
        width: 60%;
        height: 60%;
        background: radial-gradient(
            ellipse,
            rgba(100, 100, 100, 0.4) 0%,
            transparent 70%
        );
    }

    .content {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    /* Responding Phase - centered vertically */
    .responding-phase {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 2rem;
        animation: fadeIn 0.5s ease-out;
    }

    .text-container {
        max-width: 90%;
        text-align: left;
    }

    /* iPad responsive text container */
    @media (min-width: 768px) {
        .text-container {
            max-width: 70%;
        }
    }

    @media (min-width: 1024px) {
        .text-container {
            max-width: 60%;
        }
    }

    /* Static response text (when showing both) */
    .response-text {
        font-family: "Noto Serif TC", "Times New Roman", serif;
        font-size: 1.75rem;
        font-weight: 400;
        line-height: 1.6;
        color: white;
        margin: 0 0 1.5rem 0;
        opacity: 0.9;
    }

    /* Question typing section */
    .question-typing {
        margin-top: 1rem;
    }

    /* Ready Phase */
    .ready-phase {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 0 1.5rem;
        animation: fadeIn 0.5s ease-out;
    }

    /* iPad responsive ready phase */
    @media (min-width: 768px) {
        .ready-phase {
            padding: 0 3rem;
            max-width: 42rem;
            margin: 0 auto;
            width: 100%;
        }
    }

    @media (min-width: 1024px) {
        .ready-phase {
            padding: 0 4rem;
            max-width: 48rem;
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .question-section {
        padding-top: 3rem;
        padding-bottom: 1rem;
    }

    .question-text {
        font-family: "Noto Serif TC", serif;
        font-size: 1.75rem;
        font-weight: 400;
        line-height: 1.5;
        color: white;
        margin: 0;
    }

    /* iPad responsive question text */
    @media (min-width: 768px) {
        .question-text {
            font-size: 2rem;
        }
    }

    .keywords-section {
        padding: 2rem 0;
    }

    .spacer {
        flex: 1;
    }

    /* Text Input Section */
    .text-input-section {
        padding: 1rem 0;
    }

    .input-wrapper {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .input-wrapper textarea {
        flex: 1;
        background: transparent;
        border: none;
        color: white;
        font-size: 1rem;
        padding: 0.75rem;
        resize: none;
        font-family: inherit;
    }

    .input-wrapper textarea::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }

    .input-wrapper textarea:focus {
        outline: none;
    }

    .send-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 12px;
        background: #d4a855;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
    }

    .send-btn:hover:not(:disabled) {
        background: #e5b966;
    }

    .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .send-btn :global(.send-icon) {
        width: 18px;
        height: 18px;
    }

    .controls-section {
        padding-bottom: 0.5rem;
    }

    .stage-section {
        padding-bottom: env(safe-area-inset-bottom, 1rem);
    }
</style>
