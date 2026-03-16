<script lang="ts">
    import { tick } from "svelte";
    import { m } from "$lib/paraglide/messages";
    import { SvelteSet } from "svelte/reactivity";
    import { Send, ArrowLeft, ChevronDown, ChevronRight } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import TypewriterText from "$lib/components/conversation/TypewriterText.svelte";
    import VoiceControls from "$lib/components/conversation/VoiceControls.svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api, type Conversation } from "$lib/api";
    import type {
        AssessmentResult,
        DialogueStateDisplay,
    } from "mentora-firebase";

    const conversationId = $derived(page.params.id);
    const convState = api.createState<Conversation>();

    let courseId = $state<string | null>(null);

    async function subscribeConversation() {
        if (!api.isAuthenticated) {
            await api.authReady;
        }

        if (!conversationId) {
            return;
        }

        convState.cleanup();
        api.conversationsSubscribe.subscribe(conversationId, convState);
    }

    $effect(() => {
        const id = conversationId;
        const authed = api.isAuthenticated;

        if (!id) {
            convState.cleanup();
            return;
        }

        let disposed = false;

        (async () => {
            if (!authed) {
                await api.authReady;
            }

            if (disposed || conversationId !== id) {
                return;
            }

            await subscribeConversation();
        })();

        return () => {
            disposed = true;
            convState.cleanup();
        };
    });

    $effect(() => {
        const conv = convState.value;
        if (conv && conv.assignmentId && !courseId) {
            api.assignments.get(conv.assignmentId).then((res) => {
                if (res.success) {
                    if (res.data.courseId) {
                        courseId = res.data.courseId;
                    }

                    const intro = resolveConversationIntro(res.data);
                    if (intro) {
                        conversationIntro = intro;
                    }
                } else {
                    // Fallback: If we can't find the course, we might be in an orphan conversation
                    console.warn(
                        "Could not find linked course for this conversation",
                    );
                }
            });
        }
    });

    let conversation = $derived(convState.value);
    let conversationLoadError = $derived(convState.error);

    // UI State
    type Phase = "responding" | "ready";
    // Initialize to ready so we don't show blank screen if logic fails
    let phase: Phase = $state("ready");
    let typingPhase: "response" | "question" = $state("response");
    let showUserReplies = $state(false);
    let showTextInput = $state(false);
    let isRecording = $state(false);
    let awaitingAiReply = $state(false);

    let currentQuestion = $state("");
    let conversationIntro = $state("");

    let messageInput = $state("");
    let sending = $state(false);
    let sendError = $state<string | null>(null);
    const isConversationClosed = $derived(conversation?.state === "closed");

    let lastRenderedTurnId = $state<string | null>(null);
    let currentResponse = $state("");
    let responseToType = $state("");
    let questionToType = $state("");
    let sendErrorCode = $state<string | null>(null);
    let transcriptScrollEl = $state<HTMLDivElement | null>(null);
    let historyExpanded = $state(false);
    let transcriptTouchStartY = $state<number | null>(null);

    // Assessment state
    let assessmentData = $state<AssessmentResult | null>(null);
    let assessmentLoading = $state(false);
    let assessmentLoadAttempted = $state(false);
    let assessmentScoreCompletion = $state<number | null>(null);
    let expandedDimensions = new SvelteSet<string>();

    // Dialogue state (for enhanced report)
    let dialogueState = $state<DialogueStateDisplay | null>(null);

    const assessmentDimensions = $derived.by(
        () =>
            [
                {
                    key: "argumentQuality",
                    label: m.conversation_assessment_dimension_argument_quality(),
                },
                {
                    key: "criticalThinking",
                    label: m.conversation_assessment_dimension_critical_thinking(),
                },
                {
                    key: "principleExtraction",
                    label: m.conversation_assessment_dimension_principle_extraction(),
                },
                {
                    key: "openness",
                    label: m.conversation_assessment_dimension_openness(),
                },
                {
                    key: "coherence",
                    label: m.conversation_assessment_dimension_coherence(),
                },
            ] as const,
    );

    function polarToCartesian(
        cx: number,
        cy: number,
        radius: number,
        angleDeg: number,
    ) {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        return {
            x: cx + radius * Math.cos(rad),
            y: cy + radius * Math.sin(rad),
        };
    }

    function getRadarPolygonPoints(
        dimensions: Record<string, { score: number }>,
        cx: number,
        cy: number,
        maxR: number,
    ) {
        return assessmentDimensions.map((dim, i) => {
            const angle = i * 72;
            const score = dimensions[dim.key]?.score ?? 0;
            const r = (score / 5) * maxR;
            return polarToCartesian(cx, cy, r, angle);
        });
    }

    function toggleDimension(key: string) {
        if (expandedDimensions.has(key)) {
            expandedDimensions.delete(key);
        } else {
            expandedDimensions.add(key);
        }
    }

    $effect(() => {
        if (
            isConversationClosed &&
            conversation?.assignmentId &&
            !assessmentLoadAttempted
        ) {
            loadAssessment(conversation.assignmentId);
            if (conversationId) {
                loadDialogueState(conversationId);
            }
        }
    });

    async function loadAssessment(assignmentId: string) {
        assessmentLoading = true;
        assessmentLoadAttempted = true;
        try {
            const res = await api.submissions.getMine(assignmentId);
            if (res.success && res.data) {
                if (res.data.assessment) {
                    assessmentData = res.data.assessment;
                }
                if (res.data.scoreCompletion != null) {
                    assessmentScoreCompletion = res.data.scoreCompletion;
                }
            }
        } catch (e) {
            console.error("Failed to load assessment", e);
        } finally {
            assessmentLoading = false;
        }
    }

    async function loadDialogueState(convId: string) {
        try {
            const res = await api.conversations.getDialogueState(convId);
            if (res.success) {
                dialogueState = res.data;
            }
        } catch (e) {
            console.error("Failed to load dialogue state", e);
        }
    }

    function resolveConversationIntro(assignment: unknown): string {
        if (!assignment || typeof assignment !== "object") {
            return "";
        }

        const data = assignment as {
            introduction?: unknown;
            question?: unknown;
            prompt?: unknown;
        };

        if (
            typeof data.introduction === "string" &&
            data.introduction.trim().length > 0
        ) {
            return data.introduction.trim();
        }

        if (
            typeof data.question === "string" &&
            data.question.trim().length > 0
        ) {
            return data.question.trim();
        }

        if (typeof data.prompt === "string" && data.prompt.trim().length > 0) {
            return data.prompt.trim();
        }

        return "";
    }

    function extractErrorMessage(error: unknown): string {
        if (typeof error === "string") {
            return error;
        }

        if (!error || typeof error !== "object") {
            return "";
        }

        if ("message" in error && typeof error.message === "string") {
            return error.message;
        }

        if ("error" in error && typeof error.error === "string") {
            return error.error;
        }

        return "";
    }

    function extractErrorCode(error: unknown): string | null {
        if (!error || typeof error !== "object") {
            return null;
        }

        if ("serverCode" in error && typeof error.serverCode === "string") {
            return error.serverCode;
        }

        if ("code" in error && typeof error.code === "string") {
            return error.code;
        }

        return null;
    }

    function isAiTurn(
        turn: NonNullable<Conversation["turns"]>[number],
        index: number,
    ) {
        if (turn.type === "followup" || turn.type === "summary") {
            return true;
        }

        if (
            turn.type === "idea" ||
            turn.type === "topic" ||
            turn.type === "counterpoint"
        ) {
            return false;
        }

        return index % 2 === 1;
    }

    function getLatestAiTurn(turns: NonNullable<Conversation["turns"]>) {
        for (let i = turns.length - 1; i >= 0; i--) {
            if (isAiTurn(turns[i], i)) {
                return turns[i];
            }
        }
        return null;
    }

    function splitAiMessage(text: string): {
        response: string;
        question: string;
    } {
        const normalized = text.trim();
        if (!normalized) {
            return { response: "", question: "" };
        }

        const parts = normalized
            .split(/\n\s*\n+/)
            .map((part) => part.trim())
            .filter((part) => part.length > 0);

        if (parts.length === 1) {
            return { response: "", question: parts[0] };
        }

        return {
            response: parts.slice(0, -1).join("\n\n"),
            question: parts.at(-1) ?? "",
        };
    }

    type TranscriptEntry = {
        id: string;
        sourceTurnId: string;
        role: "ai" | "user";
        variant: "response" | "question" | "user";
        text: string;
        isLatest: boolean;
    };

    function buildTranscriptEntries(
        turns: NonNullable<Conversation["turns"]>,
        includeUserReplies: boolean,
        latestAiTurnId: string | null,
        omitAiTurnId: string | null = null,
    ): TranscriptEntry[] {
        const entries: TranscriptEntry[] = [];

        turns.forEach((turn, index) => {
            const text = turn.text?.trim();
            if (!text) return;

            const role = isAiTurn(turn, index) ? "ai" : "user";

            if (role === "user") {
                if (includeUserReplies) {
                    entries.push({
                        id: turn.id,
                        sourceTurnId: turn.id,
                        role: "user",
                        variant: "user",
                        text,
                        isLatest: false,
                    });
                }
                return;
            }

            if (turn.id === omitAiTurnId) {
                return;
            }

            const { response, question } = splitAiMessage(text);

            if (response) {
                entries.push({
                    id: `${turn.id}-response`,
                    sourceTurnId: turn.id,
                    role: "ai",
                    variant: "response",
                    text: response,
                    isLatest: turn.id === latestAiTurnId,
                });
            }

            const finalQuestion = question || (!response ? text : "");
            if (finalQuestion) {
                entries.push({
                    id: `${turn.id}-question`,
                    sourceTurnId: turn.id,
                    role: "ai",
                    variant: "question",
                    text: finalQuestion,
                    isLatest: turn.id === latestAiTurnId,
                });
            }
        });

        return entries;
    }

    const transcriptEntries = $derived.by(() => {
        const turns = conversation?.turns || [];
        const latestAiTurnId = getLatestAiTurn(turns)?.id ?? null;
        return buildTranscriptEntries(
            turns,
            showUserReplies,
            latestAiTurnId,
            phase === "responding" ? lastRenderedTurnId : null,
        );
    });

    async function expandHistoryFromGesture() {
        if (historyExpanded) {
            return;
        }

        historyExpanded = true;
        await tick();

        if (transcriptScrollEl) {
            transcriptScrollEl.scrollTop = Math.max(
                0,
                transcriptScrollEl.scrollHeight -
                    transcriptScrollEl.clientHeight -
                    96,
            );
        }
    }

    function handleTranscriptWheel(event: WheelEvent) {
        if (!historyExpanded && event.deltaY < -6) {
            event.preventDefault();
            void expandHistoryFromGesture();
        }
    }

    function handleTranscriptTouchStart(event: TouchEvent) {
        transcriptTouchStartY = event.touches[0]?.clientY ?? null;
    }

    function handleTranscriptTouchMove(event: TouchEvent) {
        if (historyExpanded || transcriptTouchStartY === null) {
            return;
        }

        const currentY = event.touches[0]?.clientY ?? transcriptTouchStartY;
        if (currentY - transcriptTouchStartY > 14) {
            transcriptTouchStartY = null;
            void expandHistoryFromGesture();
        }
    }

    function handleTranscriptTouchEnd() {
        transcriptTouchStartY = null;
    }

    $effect(() => {
        transcriptEntries.length;
        currentResponse;
        currentQuestion;
        phase;
        showUserReplies;
        historyExpanded;

        if (!transcriptScrollEl) {
            return;
        }

        if (historyExpanded) {
            return;
        }

        requestAnimationFrame(() => {
            if (transcriptScrollEl) {
                transcriptScrollEl.scrollTop = transcriptScrollEl.scrollHeight;
            }
        });
    });

    function goBack() {
        if (courseId) {
            goto(resolve(`/courses/${courseId}`));
        } else {
            goto(resolve("/dashboard"));
        }
    }

    $effect(() => {
        const turns = conversation?.turns || [];
        const latestAiTurn = getLatestAiTurn(turns);

        if (!latestAiTurn) {
            if (turns.length === 0) {
                currentResponse = "";
                currentQuestion =
                    conversationIntro || m.page_conversation_description();
                responseToType = "";
                questionToType = "";
                lastRenderedTurnId = null;
                awaitingAiReply = false;
            } else {
                const latestTurn = turns.at(-1);
                currentResponse = "";
                currentQuestion = latestTurn?.text ?? "";
                responseToType = "";
                questionToType = "";
                phase = "ready";
            }
            return;
        }

        const { response, question } = splitAiMessage(latestAiTurn.text);
        const normalizedQuestion = question || latestAiTurn.text;

        if (lastRenderedTurnId === null) {
            lastRenderedTurnId = latestAiTurn.id;
            currentResponse = response;
            currentQuestion = normalizedQuestion;
            responseToType = "";
            questionToType = "";
            awaitingAiReply = false;
            phase = "ready";
            return;
        }

        if (latestAiTurn.id !== lastRenderedTurnId) {
            responseToType = response;
            questionToType = normalizedQuestion;
            currentResponse = "";
            lastRenderedTurnId = latestAiTurn.id;
            awaitingAiReply = false;
            historyExpanded = false;
            phase = "responding";

            if (responseToType) {
                typingPhase = "response";
            } else {
                typingPhase = "question";
            }
        }
    });

    $effect(() => {
        if (isConversationClosed) {
            isRecording = false;
            showTextInput = false;
        }
    });

    function handleResponseComplete() {
        currentResponse = responseToType;
        setTimeout(() => {
            typingPhase = "question";
        }, 200);
    }

    function handleQuestionComplete() {
        currentQuestion = questionToType || currentQuestion;
        responseToType = "";
        questionToType = "";
        setTimeout(() => {
            phase = "ready";
        }, 300);
    }

    function handleToggleUserReplies() {
        showUserReplies = !showUserReplies;
    }

    function playBase64Audio(base64: string, mimeType: string = "audio/mp3") {
        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.addEventListener("ended", () => URL.revokeObjectURL(url), {
                once: true,
            });
            audio.addEventListener("error", () => URL.revokeObjectURL(url), {
                once: true,
            });
            audio.play().catch((e) => {
                console.error("Audio playback failed:", e);
                URL.revokeObjectURL(url);
            });
        } catch (e) {
            console.error("Failed to play audio response:", e);
        }
    }

    async function handleRecordingComplete(blob: Blob) {
        if (!conversationId || isConversationClosed) return;

        sending = true;
        awaitingAiReply = true;
        showTextInput = false;
        sendError = null;
        sendErrorCode = null;
        try {
            const audio =
                blob.type.length > 0
                    ? blob
                    : new Blob([blob], { type: "audio/webm" });

            const res = await api.conversations.addTurn(conversationId, {
                audio,
            });

            if (!res.success) {
                console.error("Failed to add audio turn:", res.error);
                const detail = extractErrorMessage(res.error);
                const code = extractErrorCode(res.error);
                sendErrorCode = code;
                sendError = detail
                    ? `${m.conversation_error()} ${detail}`
                    : m.conversation_error();
                awaitingAiReply = false;
            } else if (res.data?.audio) {
                playBase64Audio(
                    res.data.audio,
                    res.data.audioMimeType || "audio/mp3",
                );
            }
        } catch (e) {
            console.error("Error sending audio turn:", e);
            const detail = extractErrorMessage(e);
            const code = extractErrorCode(e);
            sendErrorCode = code;
            sendError = detail
                ? `${m.conversation_error()} ${detail}`
                : m.conversation_error();
            awaitingAiReply = false;
        } finally {
            sending = false;
        }
    }

    function handleShowTextInput() {
        showTextInput = !showTextInput;
    }

    async function handleRetryLoad() {
        sendError = null;
        sendErrorCode = null;
        await subscribeConversation();
    }

    async function handleSendMessage() {
        const text = messageInput.trim();
        if (!text || !conversationId || isConversationClosed) return;

        sending = true;
        awaitingAiReply = true;
        sendError = null;
        sendErrorCode = null;

        try {
            const res = await api.conversations.addTurn(conversationId, text);
            if (!res.success) {
                console.error("Failed to add turn:", res.error);
                const msg = extractErrorMessage(res.error);
                const code = extractErrorCode(res.error);
                sendErrorCode = code;
                sendError = `${m.conversation_error()} ${msg || ""}`.trim();
                awaitingAiReply = false;
            } else {
                messageInput = "";
                showTextInput = false;
                if (res.data?.audio) {
                    playBase64Audio(
                        res.data.audio,
                        res.data.audioMimeType || "audio/mp3",
                    );
                }
            }
        } catch (e) {
            console.error("Error sending message:", e);
            const detail = extractErrorMessage(e);
            const code = extractErrorCode(e);
            sendErrorCode = code;
            sendError = detail
                ? `${m.conversation_error()} ${detail}`
                : m.conversation_error();
            awaitingAiReply = false;
        } finally {
            sending = false;
        }
    }

    function handleMessageInputKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!sending && messageInput.trim()) {
                void handleSendMessage();
            }
        }
    }
</script>

<PageHead
    title={m.page_conversation_title()}
    description={m.page_conversation_description()}
/>

<div
    class={isConversationClosed
        ? "conversation-container conversation-closed"
        : "conversation-container"}
>
    <div class="background"></div>

    <div class="content relative">
        {#if courseId}
            <div class="absolute top-6 left-6 z-50">
                <button
                    class="student-icon-btn cursor-pointer rounded-full hover:-translate-x-0.5"
                    onclick={goBack}
                    aria-label={m.student_back_to_course()}
                >
                    <ArrowLeft class="h-5 w-5 text-white" />
                </button>
            </div>
        {/if}

        {#if conversation}
            <!-- Only show indicator if not in ready phase because ready phase might hide it on mobile? No, always show but positioned -->
        {/if}

        {#if !conversation && !conversationLoadError}
            <div class="flex h-full items-center justify-center">
                <div class="animate-pulse text-white/50">
                    {m.conversation_loading()}
                </div>
            </div>
        {:else if !conversation && conversationLoadError}
            <div class="flex h-full items-center justify-center px-6">
                <div class="student-panel w-full max-w-xl p-6 text-center">
                    <p class="text-lg text-white">{m.conversation_error()}</p>
                    <p class="mt-2 text-sm break-words text-white/70">
                        {conversationLoadError}
                    </p>
                    <button
                        class="student-btn-ghost mt-4"
                        onclick={handleRetryLoad}
                    >
                        {m.conversation_retry()}
                    </button>
                </div>
            </div>
        {:else if phase === "responding"}
            <div class="responding-phase">
                <div class="text-container">
                    <div class="conversation-scroll-shell">
                        <div
                            class="turn-content-scroll space-y-5 pt-6 pb-8"
                            bind:this={transcriptScrollEl}
                            role="region"
                            aria-label={m.conversation_transcript_aria()}
                            onwheel={handleTranscriptWheel}
                            ontouchstart={handleTranscriptTouchStart}
                            ontouchmove={handleTranscriptTouchMove}
                            ontouchend={handleTranscriptTouchEnd}
                        >
                            {#if historyExpanded && transcriptEntries.length > 0}
                                {#each transcriptEntries as entry (entry.id)}
                                    {#if entry.role === "user"}
                                        {#if showUserReplies}
                                            <div
                                                class="ml-auto max-w-[85%] text-right"
                                            >
                                                <p
                                                    class="m-0 text-[1rem] leading-[1.8] text-white/74"
                                                >
                                                    {entry.text}
                                                </p>
                                            </div>
                                        {/if}
                                    {:else if entry.variant === "response"}
                                        <div>
                                            <p
                                                class={entry.isLatest
                                                    ? "response-text"
                                                    : "history-response-text"}
                                            >
                                                {entry.text}
                                            </p>
                                        </div>
                                    {:else}
                                        <h2
                                            class={entry.isLatest
                                                ? "question-text"
                                                : "history-question-text"}
                                        >
                                            {entry.text}
                                        </h2>
                                    {/if}
                                {/each}
                            {/if}

                            {#if typingPhase === "response" && responseToType}
                                <div class="response-typing">
                                    <TypewriterText
                                        text={responseToType}
                                        speed={34}
                                        onComplete={handleResponseComplete}
                                    />
                                </div>
                            {/if}

                            {#if typingPhase === "question" && currentResponse}
                                <div class="response-text">
                                    {currentResponse}
                                </div>
                            {/if}

                            {#if typingPhase === "question"}
                                <div class="question-typing">
                                    <TypewriterText
                                        text={questionToType || currentQuestion}
                                        speed={42}
                                        onComplete={handleQuestionComplete}
                                    />
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
        {:else}
            <!-- Ready Phase -->
            <div class="ready-phase">
                <div class="top-spacer"></div>

                <div class="question-display min-h-[24rem]">
                    {#if awaitingAiReply}
                        <div
                            class="flex min-h-[24rem] items-center justify-center"
                        >
                            <span
                                class="thinking-caret text-[3.25rem] leading-none font-light text-white/88"
                                aria-label={m.conversation_ai_thinking_aria()}
                                >|</span
                            >
                        </div>
                    {:else}
                        <div class="conversation-scroll-shell">
                            <div
                                class="turn-content-scroll space-y-5 pt-6 pb-8"
                                bind:this={transcriptScrollEl}
                                role="region"
                                aria-label={m.conversation_transcript_aria()}
                                onwheel={handleTranscriptWheel}
                                ontouchstart={handleTranscriptTouchStart}
                                ontouchmove={handleTranscriptTouchMove}
                                ontouchend={handleTranscriptTouchEnd}
                            >
                                {#if historyExpanded && transcriptEntries.length > 0}
                                    {#each transcriptEntries as entry (entry.id)}
                                        {#if entry.role === "user"}
                                            {#if showUserReplies}
                                                <div
                                                    class="ml-auto max-w-[85%] text-right"
                                                >
                                                    <p
                                                        class="m-0 text-[1rem] leading-[1.8] text-white/74"
                                                    >
                                                        {entry.text}
                                                    </p>
                                                </div>
                                            {/if}
                                        {:else if entry.variant === "response"}
                                            <div>
                                                <p
                                                    class={entry.isLatest
                                                        ? "response-text"
                                                        : "history-response-text"}
                                                >
                                                    {entry.text}
                                                </p>
                                            </div>
                                        {:else}
                                            <h2
                                                class={entry.isLatest
                                                    ? "question-text"
                                                    : "history-question-text"}
                                            >
                                                {entry.text}
                                            </h2>
                                        {/if}
                                    {/each}
                                {:else}
                                    {#if currentResponse}
                                        <p class="response-text">
                                            {currentResponse}
                                        </p>
                                    {/if}
                                    {#if currentQuestion}
                                        <h2 class="question-text">
                                            {currentQuestion}
                                        </h2>
                                    {/if}
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>

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
                                onkeydown={handleMessageInputKeydown}
                            ></textarea>
                            <button
                                class="send-btn"
                                onclick={handleSendMessage}
                                disabled={sending || !messageInput.trim()}
                                aria-label={m.conversation_send()}
                            >
                                <Send class="send-icon" />
                            </button>
                        </div>
                    </div>
                {/if}

                <!-- Voice controls -->
                <div class="controls-section">
                    <VoiceControls
                        {showUserReplies}
                        {showTextInput}
                        bind:isRecording
                        disabled={sending}
                        recordDisabled={isConversationClosed}
                        textInputDisabled={isConversationClosed}
                        onToggleUserReplies={handleToggleUserReplies}
                        onShowTextInput={handleShowTextInput}
                        onRecordingComplete={handleRecordingComplete}
                    />
                </div>

                <div class="controls-section">
                    {#if sendError}
                        <p class="text-center text-sm text-white/78">
                            {sendError}
                        </p>
                        {#if sendErrorCode}
                            <p class="mt-2 text-center text-xs text-white/60">
                                {m.error_code_label()}: {sendErrorCode}
                            </p>
                        {/if}
                    {/if}
                </div>
            </div>
        {/if}

        <!-- Assessment Results Section (shown when conversation is closed) -->
        {#if isConversationClosed}
            <div class="assessment-section">
                {#if assessmentLoading}
                    <div class="flex items-center justify-center py-12">
                        <div class="animate-pulse text-white/50">
                            {m.conversation_assessment_loading()}
                        </div>
                    </div>
                {:else if assessmentData}
                    <div class="mx-auto w-full max-w-2xl px-6 py-8">
                        <h2
                            class="font-serif-tc mb-6 text-2xl font-bold text-white"
                        >
                            {m.conversation_assessment_title()}
                        </h2>

                        <!-- Radar Chart -->
                        <div class="mb-8 flex justify-center">
                            <svg
                                viewBox="0 0 200 200"
                                width="200"
                                height="200"
                                class="drop-shadow-lg"
                            >
                                <!-- Grid rings -->
                                {#each [1, 2, 3, 4, 5] as level (level)}
                                    {@const r = (level / 5) * 80}
                                    <polygon
                                        points={assessmentDimensions
                                            .map((_, i) => {
                                                const pt = polarToCartesian(
                                                    100,
                                                    100,
                                                    r,
                                                    i * 72,
                                                );
                                                return `${pt.x},${pt.y}`;
                                            })
                                            .join(" ")}
                                        fill="none"
                                        stroke="rgba(255,255,255,0.15)"
                                        stroke-width="0.5"
                                    />
                                {/each}
                                <!-- Axis lines -->
                                <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
                                {#each assessmentDimensions as _dim, i (i)}
                                    {@const pt = polarToCartesian(
                                        100,
                                        100,
                                        80,
                                        i * 72,
                                    )}
                                    <line
                                        x1="100"
                                        y1="100"
                                        x2={pt.x}
                                        y2={pt.y}
                                        stroke="rgba(255,255,255,0.1)"
                                        stroke-width="0.5"
                                    />
                                {/each}
                                <!-- Data polygon & points -->
                                {#each [getRadarPolygonPoints(assessmentData.dimensions, 100, 100, 80)] as pts, i (i)}
                                    <polygon
                                        points={pts
                                            .map((p) => `${p.x},${p.y}`)
                                            .join(" ")}
                                        fill="rgba(255, 255, 255, 0.16)"
                                        stroke="rgba(255,255,255,0.72)"
                                        stroke-width="2"
                                    />
                                    {#each pts as pt, i (i)}
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r="3"
                                            fill="rgba(255,255,255,0.86)"
                                        />
                                    {/each}
                                {/each}
                                <!-- Labels -->
                                {#each assessmentDimensions as dim, i (dim.key)}
                                    {@const labelPt = polarToCartesian(
                                        100,
                                        100,
                                        95,
                                        i * 72,
                                    )}
                                    <text
                                        x={labelPt.x}
                                        y={labelPt.y}
                                        text-anchor="middle"
                                        dominant-baseline="middle"
                                        fill="rgba(255,255,255,0.8)"
                                        font-size="10">{dim.label}</text
                                    >
                                {/each}
                            </svg>
                        </div>

                        <!-- Overall Score -->
                        <div
                            class="mb-6 rounded-xl bg-[#5f5f5f] p-5 text-center"
                        >
                            <div class="mb-1 text-sm text-white/60">
                                {m.conversation_assessment_overall_score()}
                            </div>
                            <div
                                class="font-serif-tc text-4xl font-bold text-white"
                            >
                                {assessmentData.overallScore.toFixed(1)}
                                <span class="text-lg text-white/40">/ 5</span>
                            </div>
                        </div>

                        <!-- Overall Feedback -->
                        {#if assessmentData.overallFeedback}
                            <div class="mb-6 rounded-xl bg-[#5f5f5f] p-5">
                                <div
                                    class="mb-2 text-sm font-medium text-white/60"
                                >
                                    {m.conversation_assessment_overall_feedback()}
                                </div>
                                <p class="leading-relaxed text-white/90">
                                    {assessmentData.overallFeedback}
                                </p>
                            </div>
                        {/if}

                        <!-- Conversation Summary -->
                        {#if dialogueState?.summary}
                            <div class="mb-6 rounded-xl bg-[#5f5f5f] p-5">
                                <div
                                    class="mb-2 text-sm font-medium text-white/60"
                                >
                                    {m.conversation_assessment_summary()}
                                </div>
                                <p class="leading-relaxed text-white/90">
                                    {dialogueState.summary}
                                </p>
                            </div>
                        {/if}

                        <!-- Dimension Scores -->
                        <div class="mb-6 space-y-2">
                            {#each assessmentDimensions as dim (dim.key)}
                                {@const dimData =
                                    assessmentData.dimensions[dim.key]}
                                {#if dimData}
                                    <div class="rounded-xl bg-[#5f5f5f]">
                                        <button
                                            class="flex w-full cursor-pointer items-center justify-between p-4 text-left"
                                            onclick={() =>
                                                toggleDimension(dim.key)}
                                        >
                                            <div
                                                class="flex items-center gap-3"
                                            >
                                                {#if expandedDimensions.has(dim.key)}
                                                    <ChevronDown
                                                        class="h-4 w-4 text-white/50"
                                                    />
                                                {:else}
                                                    <ChevronRight
                                                        class="h-4 w-4 text-white/50"
                                                    />
                                                {/if}
                                                <span class="text-white"
                                                    >{dim.label}</span
                                                >
                                            </div>
                                            <span
                                                class="font-serif-tc text-lg font-bold text-white"
                                                >{dimData.score}<span
                                                    class="text-sm text-white/40"
                                                    >/5</span
                                                ></span
                                            >
                                        </button>
                                        {#if expandedDimensions.has(dim.key) && dimData.feedback}
                                            <div
                                                class="border-t border-white/5 px-4 pt-3 pb-4"
                                            >
                                                <p
                                                    class="text-sm leading-relaxed text-white/70"
                                                >
                                                    {dimData.feedback}
                                                </p>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            {/each}
                        </div>

                        <!-- Stance Evolution -->
                        {#if dialogueState?.stanceHistory && dialogueState.stanceHistory.length > 0}
                            <div class="mb-6">
                                <h3 class="mb-3 text-lg font-medium text-white">
                                    {m.conversation_assessment_stance_history()}
                                </h3>
                                <div class="space-y-3">
                                    {#each dialogueState.stanceHistory as stance (stance.version)}
                                        <div
                                            class="rounded-xl bg-[#5f5f5f] p-4"
                                        >
                                            <div
                                                class="mb-2 flex items-center justify-between"
                                            >
                                                <span
                                                    class="text-sm font-medium text-white/72"
                                                >
                                                    {m.conversation_assessment_stance_version(
                                                        {
                                                            version:
                                                                stance.version,
                                                        },
                                                    )}
                                                </span>
                                                {#if stance.confidence != null}
                                                    <span
                                                        class="text-xs text-white/40"
                                                    >
                                                        {m.conversation_assessment_confidence(
                                                            {
                                                                value: (
                                                                    stance.confidence *
                                                                    100
                                                                ).toFixed(0),
                                                            },
                                                        )}
                                                    </span>
                                                {/if}
                                            </div>
                                            <p
                                                class="mb-1 text-sm font-medium text-white/90"
                                            >
                                                {stance.position}
                                            </p>
                                            <p class="text-sm text-white/60">
                                                {stance.reason}
                                            </p>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <!-- Principle History -->
                        {#if dialogueState?.principleHistory && dialogueState.principleHistory.length > 0}
                            <div class="mb-6">
                                <h3 class="mb-3 text-lg font-medium text-white">
                                    {m.conversation_assessment_principle_history()}
                                </h3>
                                <div class="space-y-3">
                                    {#each dialogueState.principleHistory as principle (principle.version)}
                                        <div
                                            class="rounded-xl bg-[#5f5f5f] p-4"
                                        >
                                            <div
                                                class="mb-2 flex items-center justify-between"
                                            >
                                                <span
                                                    class="text-sm font-medium text-white/72"
                                                >
                                                    {m.conversation_assessment_principle_version(
                                                        {
                                                            version:
                                                                principle.version,
                                                        },
                                                    )}
                                                </span>
                                                {#if principle.classification}
                                                    <span
                                                        class="rounded-full bg-[#6a6a6a] px-2 py-0.5 text-xs text-white/70"
                                                    >
                                                        {principle.classification}
                                                    </span>
                                                {/if}
                                            </div>
                                            <p class="text-sm text-white/90">
                                                {principle.statement}
                                            </p>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <!-- Conversation Transcript -->
                        {#if conversation?.turns && conversation.turns.length > 0}
                            <div class="mb-6">
                                <h3 class="mb-3 text-lg font-medium text-white">
                                    {m.conversation_assessment_transcript()}
                                </h3>
                                <div class="space-y-2">
                                    {#each conversation.turns as turn (turn.id)}
                                        <div
                                            class="rounded-xl bg-[#5f5f5f] p-4"
                                        >
                                            <div
                                                class="mb-1 flex items-center gap-2"
                                            >
                                                <span
                                                    class="text-xs font-medium {turn.type ===
                                                    'idea'
                                                        ? 'text-blue-300'
                                                        : 'text-white/72'}"
                                                >
                                                    {turn.type === "idea"
                                                        ? m.conversation_assessment_student()
                                                        : m.conversation_assessment_ai()}
                                                </span>
                                                {#if turn.analysis?.stance}
                                                    <span
                                                        class="rounded-full bg-[#6a6a6a] px-2 py-0.5 text-xs text-white/55"
                                                    >
                                                        {turn.analysis.stance}
                                                    </span>
                                                {/if}
                                            </div>
                                            <p
                                                class="text-sm leading-relaxed text-white/80"
                                            >
                                                {turn.text}
                                            </p>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <!-- Teacher Score -->
                        <div class="rounded-xl bg-[#5f5f5f] p-5 text-center">
                            <div class="mb-1 text-sm text-white/60">
                                {m.conversation_assessment_teacher_score()}
                            </div>
                            {#if assessmentScoreCompletion != null}
                                <div
                                    class="font-serif-tc text-2xl font-bold text-white"
                                >
                                    {assessmentScoreCompletion}
                                    <span class="text-sm text-white/40"
                                        >/ 100</span
                                    >
                                </div>
                            {:else}
                                <div class="text-white/40">
                                    {m.conversation_assessment_not_graded()}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
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

    .conversation-container.conversation-closed {
        position: relative;
        min-height: 100vh;
        overflow: auto;
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

    .conversation-container.conversation-closed .background {
        position: fixed;
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
        font-weight: 700;
        line-height: 1.6;
        color: white;
        margin: 0 0 1.5rem 0;
        opacity: 0.9;
    }

    .history-response-text {
        font-family: "Noto Serif TC", "Times New Roman", serif;
        font-size: 1.18rem;
        font-weight: 700;
        line-height: 1.75;
        color: rgba(255, 255, 255, 0.8);
        margin: 0 0 1rem 0;
    }

    .response-typing {
        margin-bottom: 1.5rem;
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

    .conversation-scroll-shell {
        position: relative;
        overflow: hidden;
    }

    .turn-content-scroll {
        max-height: min(68vh, 46rem);
        overflow-y: auto;
        padding-right: 0.25rem;
        scroll-behavior: smooth;
        scrollbar-width: none;
        -webkit-mask-image: linear-gradient(
            to bottom,
            transparent 0,
            black 3.4rem,
            black calc(100% - 3.4rem),
            transparent 100%
        );
        mask-image: linear-gradient(
            to bottom,
            transparent 0,
            black 3.4rem,
            black calc(100% - 3.4rem),
            transparent 100%
        );
    }

    .turn-content-scroll::-webkit-scrollbar {
        display: none;
    }

    .question-text {
        font-family: "Noto Serif TC", "Times New Roman", serif;
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1.5;
        color: white;
    }

    @media (min-width: 768px) {
        .question-text {
            font-size: 1.75rem;
        }
    }

    .history-question-text {
        font-family: "Noto Serif TC", "Times New Roman", serif;
        font-size: 1.16rem;
        font-weight: 700;
        line-height: 1.7;
        color: rgba(255, 255, 255, 0.86);
        margin: 0;
    }

    @media (min-width: 768px) {
        .history-question-text {
            font-size: 1.3rem;
        }
    }

    .spacer {
        flex: 1;
    }

    .thinking-caret {
        animation: blinkCaret 1.1s ease-in-out infinite;
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

    @keyframes blinkCaret {
        0%,
        100% {
            opacity: 0.22;
        }
        50% {
            opacity: 0.95;
        }
    }

    .assessment-section {
        animation: fadeIn 0.5s ease-out;
    }

    .conversation-container.conversation-closed .content {
        min-height: 100vh;
    }
</style>
