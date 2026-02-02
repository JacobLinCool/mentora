<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { Send, ArrowLeft } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import TypewriterText from "$lib/components/conversation/TypewriterText.svelte";
    import KeywordsPanel from "$lib/components/conversation/KeywordsPanel.svelte";
    import VoiceControls from "$lib/components/conversation/VoiceControls.svelte";
    import StageIndicator from "$lib/components/conversation/StageIndicator.svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api, type Conversation } from "$lib/api";

    const conversationId = $derived(page.params.id);
    const convState = api.createState<Conversation>();

    let courseId = $state<string | null>(null);

    $effect(() => {
        if (conversationId && api.isAuthenticated) {
            api.conversationsSubscribe.subscribe(conversationId, convState);
            return () => {
                if (convState) {
                    convState.cleanup();
                }
            };
        }
    });

    $effect(() => {
        const conv = convState.value;
        if (conv && conv.assignmentId && !courseId) {
            api.assignments.get(conv.assignmentId).then((res) => {
                if (res.success && res.data.courseId) {
                    courseId = res.data.courseId;
                } else if (!res.success) {
                    // Fallback: If we can't find the course, we might be in an orphan conversation
                    console.warn(
                        "Could not find linked course for this conversation",
                    );
                }
            });
        }
    });

    let conversation = $derived(convState.value);

    // UI State
    type Phase = "responding" | "ready";
    // Initialize to ready so we don't show blank screen if logic fails
    let phase: Phase = $state("ready");
    let typingPhase: "response" | "question" = $state("response");
    let showKeywords = $state(false);
    let showTextInput = $state(false);
    let isRecording = $state(false);

    // Data derived
    const stageMap: Record<string, number> = {
        awaiting_idea: 1,
        adding_counterpoint: 2,
        awaiting_followup: 3,
        adding_final_summary: 4,
        closed: 5,
    };
    let currentStage = $derived(
        conversation?.state ? (stageMap[conversation.state as string] ?? 1) : 1,
    );
    let totalStages = $derived(5);

    let currentQuestion = $state("");
    let keywords = $state<string[]>([]);

    let messageInput = $state("");
    let sending = $state(false);

    let lastProcessedTurnId = $state<string | null>(null);

    function goBack() {
        if (courseId) {
            goto(resolve(`/courses/${courseId}`));
        } else {
            goto(resolve("/dashboard"));
        }
    }

    $effect(() => {
        const turns = conversation?.turns || [];
        const lastTurn = turns.at(-1);

        if (lastTurn && lastTurn.id !== lastProcessedTurnId) {
            // Heuristic: If type is 'idea' or 'followup', it is likely user.
            const isUser =
                lastTurn.type === "idea" || lastTurn.type === "followup";

            if (!isUser) {
                // New assistant message
                const content = lastTurn.text;

                currentQuestion = content;

                lastProcessedTurnId = lastTurn.id;

                // Trigger UI flow
                phase = "responding";
                typingPhase = "question";
            } else {
                // User message
                lastProcessedTurnId = lastTurn.id;
                // Stay in ready or show thinking?
            }
        } else if (turns.length > 0 && lastProcessedTurnId === null) {
            // First load initialization
            const last = turns.at(-1);
            if (last) {
                lastProcessedTurnId = last.id;
                const isUser = last.type === "idea" || last.type === "followup";

                if (!isUser) {
                    currentQuestion = last.text;
                    // Don't re-type on load, just show
                    phase = "ready";
                }
            }
        }
    });

    /* function handleResponseComplete() {
        setTimeout(() => {
            typingPhase = "question";
        }, 300);
    } */

    function handleQuestionComplete() {
        setTimeout(() => {
            phase = "ready";
        }, 500);
    }

    function handleToggleKeywords() {
        showKeywords = !showKeywords;
    }

    async function handleRecordingComplete(blob: Blob) {
        // Placeholder for audio processing
        // In the future, this will:
        // 1. Upload the blob to cloud storage
        // 2. Call the transcription API (or send directly to LLM)
        // 3. Add the user's turn with audioId

        console.log("Audio recorded:", blob.size, "bytes");

        // Simulate sending state for UI feedback
        sending = true;

        // Simulate processing delay
        setTimeout(async () => {
            // For now, we can't really do anything without the backend support
            // So we just reset the state.
            // Ideally, we would simulate a user message saying "[Audio Message]"
            // if we wanted to test the flow.

            // await api.conversations.addTurn(conversationId, "[Audio Message Placeholder]", "idea");

            sending = false;
        }, 1500);
    }

    function handleShowTextInput() {
        showTextInput = !showTextInput;
    }

    async function handleSendMessage() {
        if (!messageInput.trim() || !conversationId) return;

        sending = true;

        try {
            const res = await api.conversations.addTurn(
                conversationId,
                messageInput,
                "idea",
            );
            if (!res.success) {
                console.error("Failed to add turn:", res.error);
                let msg = String(res.error);
                if (
                    typeof res.error === "object" &&
                    res.error !== null &&
                    "message" in res.error
                ) {
                    msg = (res.error as { message: string }).message;
                }
                alert("Failed to send message: " + (msg || "Unknown error"));
            } else {
                messageInput = "";
                showTextInput = false;
            }
        } catch (e) {
            console.error("Error sending message:", e);
            alert("Error sending message. Check console for details.");
        } finally {
            sending = false;
        }
    }
</script>

<PageHead title="Conversation" />

<div class="conversation-container">
    <div class="background"></div>

    <div class="content relative">
        {#if courseId}
            <div class="absolute top-6 left-6 z-50">
                <button
                    class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 transition-all hover:translate-x-[-2px] hover:bg-white/15"
                    onclick={goBack}
                    aria-label="Back to course"
                >
                    <ArrowLeft class="h-5 w-5 text-white" />
                </button>
            </div>
        {/if}

        {#if conversation}
            <!-- Only show indicator if not in ready phase because ready phase might hide it on mobile? No, always show but positioned -->
        {/if}

        {#if !conversation}
            <div class="flex h-full items-center justify-center">
                <div class="animate-pulse text-white/50">
                    Loading conversation...
                </div>
            </div>
        {:else if phase === "responding"}
            <div class="responding-phase">
                <div class="text-container">
                    {#if typingPhase === "response" || typingPhase === "question"}
                        <div class="response-text">
                            <!-- TODO: Separate response/question parts logic -->
                        </div>
                    {/if}

                    {#if typingPhase === "question"}
                        <div class="question-typing">
                            <TypewriterText
                                text={currentQuestion}
                                speed={30}
                                onComplete={handleQuestionComplete}
                            />
                        </div>
                    {/if}
                </div>
            </div>
        {:else}
            <!-- Ready Phase -->
            <div class="ready-phase">
                <div class="top-spacer"></div>

                <div class="question-display">
                    <h2 class="question-text">{currentQuestion}</h2>
                </div>

                <!-- Keywords Panel (when visible) -->
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
                        bind:isRecording
                        onToggleKeywords={handleToggleKeywords}
                        onShowTextInput={handleShowTextInput}
                        onRecordingComplete={handleRecordingComplete}
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

    .top-spacer {
        flex: 1;
        min-height: 2rem;
    }

    .question-display {
        margin-bottom: 2rem;
    }

    .question-text {
        font-family: "Noto Serif TC", "Times New Roman", serif;
        font-size: 1.5rem;
        font-weight: 400;
        line-height: 1.5;
        color: white;
    }

    @media (min-width: 768px) {
        .question-text {
            font-size: 1.75rem;
        }
    }

    .keywords-section {
        margin-bottom: 1rem;
    }

    .spacer {
        flex: 1;
    }

    .text-input-section {
        margin-bottom: 1rem;
        animation: slideUp 0.3s ease-out;
    }

    .input-wrapper {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(12px);
        border-radius: 1.5rem; /* Fully rounded */
        padding: 0.5rem;
        display: flex;
        align-items: flex-end;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .input-wrapper textarea {
        flex: 1;
        background: transparent;
        border: none;
        color: white;
        resize: none;
        padding: 0.75rem 1rem;
        font-size: 1rem;
        line-height: 1.5;
        outline: none;
        max-height: 120px;
    }

    .input-wrapper textarea::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }

    /* Custom scrollbar for textarea */
    .input-wrapper textarea::-webkit-scrollbar {
        width: 4px;
    }

    .input-wrapper textarea::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
    }

    .send-btn {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background: #fff;
        color: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0.25rem;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .send-btn:disabled {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.3);
        cursor: not-allowed;
    }

    .send-btn:not(:disabled):hover {
        transform: scale(1.05);
        background: #f0f0f0;
    }

    .controls-section {
        margin-bottom: 1.5rem;
    }

    .stage-section {
        margin-bottom: 2rem; /* Space from bottom */
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes slideUp {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
</style>
