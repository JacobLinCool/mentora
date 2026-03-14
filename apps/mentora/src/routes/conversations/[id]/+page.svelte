<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { SvelteMap, SvelteSet } from "svelte/reactivity";
    import { Send, ArrowLeft, ChevronDown, ChevronRight } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import TypewriterText from "$lib/components/conversation/TypewriterText.svelte";
    import KeywordsPanel from "$lib/components/conversation/KeywordsPanel.svelte";
    import VoiceControls from "$lib/components/conversation/VoiceControls.svelte";
    import StageIndicator from "$lib/components/conversation/StageIndicator.svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api, type Conversation } from "$lib/api";
    import type { AssessmentResult } from "mentora-firebase";
    import {
        resolveConversationStage,
        TOTAL_CONVERSATION_STAGES,
    } from "$lib/features/conversation/stage";

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
    let showKeywords = $state(false);
    let showTextInput = $state(false);
    let isRecording = $state(false);

    // Data derived
    let currentStage = $derived(resolveConversationStage(conversation?.state));
    let totalStages = $derived(TOTAL_CONVERSATION_STAGES);

    let currentQuestion = $state("");
    let conversationIntro = $state("");
    let keywords = $state<string[]>([]);

    let messageInput = $state("");
    let sending = $state(false);
    let sendError = $state<string | null>(null);
    const isConversationClosed = $derived(conversation?.state === "closed");

    let lastRenderedTurnId = $state<string | null>(null);
    let currentResponse = $state("");
    let responseToType = $state("");
    let questionToType = $state("");
    let sendErrorCode = $state<string | null>(null);

    // Assessment state
    let assessmentData = $state<AssessmentResult | null>(null);
    let assessmentLoading = $state(false);
    let assessmentLoadAttempted = $state(false);
    let assessmentScoreCompletion = $state<number | null>(null);
    let expandedDimensions = new SvelteSet<string>();

    const assessmentDimensions = [
        { key: "argumentQuality", label: "論證品質" },
        { key: "criticalThinking", label: "批判思考" },
        { key: "principleExtraction", label: "原則提煉" },
        { key: "openness", label: "開放性" },
        { key: "coherence", label: "論述連貫性" },
    ] as const;

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

    const KEYWORD_STOP_WORDS = new Set([
        "the",
        "and",
        "for",
        "that",
        "with",
        "this",
        "have",
        "from",
        "your",
        "about",
        "into",
        "they",
        "them",
        "you",
        "are",
        "was",
        "were",
        "will",
        "can",
        "not",
        "but",
        "all",
        "any",
        "our",
        "out",
        "too",
        "its",
        "than",
        "then",
        "what",
        "when",
        "where",
        "who",
        "why",
        "how",
        "also",
        "very",
        "just",
        "like",
        "there",
        "their",
        "been",
        "being",
        "more",
        "most",
        "only",
        "each",
        "much",
        "many",
        "some",
        "such",
        "does",
        "did",
        "done",
        "could",
        "should",
        "would",
        "might",
        "must",
    ]);

    function extractKeywordsFromTurns(
        turns: NonNullable<Conversation["turns"]>,
    ): string[] {
        const freq = new SvelteMap<string, number>();
        const recentTurns = turns.slice(-10);

        for (const turn of recentTurns) {
            const text = turn.text?.trim();
            if (!text) {
                continue;
            }

            const hanSegments = text.match(/\p{Script=Han}{2,}/gu) ?? [];
            for (const token of hanSegments) {
                if (token.length > 8) {
                    continue;
                }
                freq.set(token, (freq.get(token) ?? 0) + 1);
            }

            const latinTokens = text
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, " ")
                .split(/\s+/)
                .filter(
                    (word) => word.length >= 3 && !KEYWORD_STOP_WORDS.has(word),
                );

            for (const token of latinTokens) {
                freq.set(token, (freq.get(token) ?? 0) + 1);
            }
        }

        return [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text]) => text);
    }

    function goBack() {
        if (courseId) {
            goto(resolve(`/courses/${courseId}`));
        } else {
            goto(resolve("/dashboard"));
        }
    }

    $effect(() => {
        const turns = conversation?.turns || [];
        keywords = extractKeywordsFromTurns(turns);
        const latestAiTurn = getLatestAiTurn(turns);

        if (!latestAiTurn) {
            if (turns.length === 0) {
                currentResponse = "";
                currentQuestion =
                    conversationIntro || m.page_conversation_description();
                responseToType = "";
                questionToType = "";
                lastRenderedTurnId = null;
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
            phase = "ready";
            return;
        }

        if (latestAiTurn.id !== lastRenderedTurnId) {
            responseToType = response;
            questionToType = normalizedQuestion;
            currentResponse = "";
            lastRenderedTurnId = latestAiTurn.id;
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

    function handleToggleKeywords() {
        showKeywords = !showKeywords;
    }

    async function handleRecordingComplete(blob: Blob) {
        if (!conversationId || isConversationClosed) return;

        sending = true;
        showTextInput = false;
        sendError = null;
        sendErrorCode = null;
        try {
            const audio =
                blob.type.length > 0
                    ? blob
                    : new Blob([blob], { type: "audio/webm" });

            const formData = new FormData();
            formData.set(
                "audio",
                audio,
                `recording.${audio.type.includes("mp4") ? "mp4" : "webm"}`,
            );

            const res = await api.backend.call(
                `/conversations/${conversationId}/turns`,
                {
                    method: "POST",
                    body: formData,
                },
            );

            if (!res.success) {
                console.error("Failed to add audio turn:", res.error);
                const detail = extractErrorMessage(res.error);
                const code = extractErrorCode(res.error);
                sendErrorCode = code;
                sendError = detail
                    ? `${m.conversation_error()} ${detail}`
                    : m.conversation_error();
            }
        } catch (e) {
            console.error("Error sending audio turn:", e);
            const detail = extractErrorMessage(e);
            const code = extractErrorCode(e);
            sendErrorCode = code;
            sendError = detail
                ? `${m.conversation_error()} ${detail}`
                : m.conversation_error();
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
            } else {
                messageInput = "";
                showTextInput = false;
            }
        } catch (e) {
            console.error("Error sending message:", e);
            const detail = extractErrorMessage(e);
            const code = extractErrorCode(e);
            sendErrorCode = code;
            sendError = detail
                ? `${m.conversation_error()} ${detail}`
                : m.conversation_error();
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

<PageHead title="Conversation" />

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
                    class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 transition-all hover:-translate-x-0.5 hover:bg-white/15"
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

        {#if !conversation && !conversationLoadError}
            <div class="flex h-full items-center justify-center">
                <div class="animate-pulse text-white/50">
                    {m.conversation_loading()}
                </div>
            </div>
        {:else if !conversation && conversationLoadError}
            <div class="flex h-full items-center justify-center px-6">
                <div
                    class="w-full max-w-xl rounded-2xl border border-white/15 bg-white/8 p-6 text-center backdrop-blur-sm"
                >
                    <p class="text-lg text-white">{m.conversation_error()}</p>
                    <p class="mt-2 text-sm break-words text-white/70">
                        {conversationLoadError}
                    </p>
                    <button
                        class="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                        onclick={handleRetryLoad}
                    >
                        Retry
                    </button>
                </div>
            </div>
        {:else if phase === "responding"}
            <div class="responding-phase">
                <div class="text-container">
                    <div class="turn-content-scroll">
                        {#if typingPhase === "response" && responseToType}
                            <div class="response-typing">
                                <TypewriterText
                                    text={responseToType}
                                    speed={22}
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
                                    speed={30}
                                    onComplete={handleQuestionComplete}
                                />
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
            <!-- Ready Phase -->
            <div class="ready-phase">
                <div class="top-spacer"></div>

                <div class="question-display">
                    <div class="turn-content-scroll">
                        {#if currentResponse}
                            <p class="response-text">{currentResponse}</p>
                        {/if}
                        <h2 class="question-text">{currentQuestion}</h2>
                    </div>
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
                        {showKeywords}
                        {showTextInput}
                        bind:isRecording
                        disabled={sending}
                        recordDisabled={isConversationClosed}
                        textInputDisabled={isConversationClosed}
                        onToggleKeywords={handleToggleKeywords}
                        onShowTextInput={handleShowTextInput}
                        onRecordingComplete={handleRecordingComplete}
                    />
                </div>

                <!-- Stage indicator -->
                <div class="stage-section">
                    {#if sendError}
                        <p class="mb-2 text-center text-sm text-amber-300">
                            {sendError}
                        </p>
                        {#if sendErrorCode}
                            <p class="mb-2 text-center text-xs text-white/60">
                                code: {sendErrorCode}
                            </p>
                        {/if}
                    {/if}
                    <StageIndicator {currentStage} {totalStages} />
                </div>
            </div>
        {/if}

        <!-- Assessment Results Section (shown when conversation is closed) -->
        {#if isConversationClosed}
            <div class="assessment-section">
                {#if assessmentLoading}
                    <div class="flex items-center justify-center py-12">
                        <div class="animate-pulse text-white/50">
                            載入評估結果中...
                        </div>
                    </div>
                {:else if assessmentData}
                    <div class="mx-auto w-full max-w-2xl px-6 py-8">
                        <h2 class="mb-6 font-serif text-2xl text-white">
                            學習評估
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
                                        fill="rgba(251, 191, 36, 0.25)"
                                        stroke="#fbbf24"
                                        stroke-width="2"
                                    />
                                    {#each pts as pt, i (i)}
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r="3"
                                            fill="#fbbf24"
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
                            class="mb-6 rounded-xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm"
                        >
                            <div class="mb-1 text-sm text-white/60">
                                整體分數
                            </div>
                            <div class="text-brand-gold font-serif text-4xl">
                                {assessmentData.overallScore.toFixed(1)}
                                <span class="text-lg text-white/40">/ 5</span>
                            </div>
                        </div>

                        <!-- Overall Feedback -->
                        {#if assessmentData.overallFeedback}
                            <div
                                class="mb-6 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                            >
                                <div
                                    class="mb-2 text-sm font-medium text-white/60"
                                >
                                    整體回饋
                                </div>
                                <p class="leading-relaxed text-white/90">
                                    {assessmentData.overallFeedback}
                                </p>
                            </div>
                        {/if}

                        <!-- Dimension Scores -->
                        <div class="mb-6 space-y-2">
                            {#each assessmentDimensions as dim (dim.key)}
                                {@const dimData =
                                    assessmentData.dimensions[dim.key]}
                                {#if dimData}
                                    <div
                                        class="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
                                    >
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
                                                class="text-brand-gold font-serif text-lg"
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

                        <!-- Teacher Score -->
                        <div
                            class="rounded-xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm"
                        >
                            <div class="mb-1 text-sm text-white/60">
                                教師評分
                            </div>
                            {#if assessmentScoreCompletion != null}
                                <div class="font-serif text-2xl text-white">
                                    {assessmentScoreCompletion}
                                    <span class="text-sm text-white/40"
                                        >/ 100</span
                                    >
                                </div>
                            {:else}
                                <div class="text-white/40">尚未評分</div>
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
        font-weight: 400;
        line-height: 1.6;
        color: white;
        margin: 0 0 1.5rem 0;
        opacity: 0.9;
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

    .turn-content-scroll {
        max-height: min(42vh, 24rem);
        overflow-y: auto;
        padding-right: 0.25rem;
        scroll-behavior: smooth;
    }

    .turn-content-scroll::-webkit-scrollbar {
        width: 6px;
    }

    .turn-content-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.22);
        border-radius: 999px;
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

    .assessment-section {
        animation: fadeIn 0.5s ease-out;
    }

    .conversation-container.conversation-closed .content {
        min-height: 100vh;
    }
</style>
