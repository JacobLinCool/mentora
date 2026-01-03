<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/state";
    import { m } from "$lib/paraglide/messages";
    import { api, type Conversation, type Turn } from "$lib";
    import { Alert, Spinner } from "flowbite-svelte";
    import { ArrowLeft, Send, User, Bot, Sparkles } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import StatusBadge from "$lib/components/ui/StatusBadge.svelte";

    const conversationId = $derived(page.params.id);

    const conversationState = api.createState<Conversation>();
    let conversation = $derived(conversationState.value);
    let loading = $derived(conversationState.loading);
    let error = $derived(conversationState.error);

    let messageInput = $state("");
    let sending = $state(false);
    let sendError = $state<string | null>(null);

    onMount(() => {
        if (conversationId) {
            api.conversationsSubscribe.subscribe(
                conversationId,
                conversationState,
            );
        }
    });

    onDestroy(() => {
        conversationState.cleanup();
    });

    async function handleSendMessage() {
        if (!messageInput.trim() || !conversationId) return;

        sending = true;
        sendError = null;

        try {
            // Call backend to add a turn
            const result = await api.backend.call<{ success: boolean }>(
                `/conversations/${conversationId}/turns`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: messageInput.trim() }),
                },
            );

            if (result.success) {
                messageInput = "";
            } else {
                sendError = result.error;
            }
        } catch (e) {
            sendError =
                e instanceof Error ? e.message : "Failed to send message";
        } finally {
            sending = false;
        }
    }

    function formatTime(timestamp: number) {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getTurnIcon(turn: Turn) {
        // User turns typically have certain types
        const userTypes = ["idea", "counterpoint", "followup"];
        return userTypes.includes(turn.type) ? User : Bot;
    }

    function getTurnLabel(turn: Turn) {
        const userTypes = ["idea", "counterpoint", "followup"];
        return userTypes.includes(turn.type)
            ? m.conversation_turn_user()
            : m.conversation_turn_system();
    }

    // Helper to map backend stance to our StatusBadge types
    // StatusBadge expecting: 'active' | 'success' | 'warning' | 'error' | 'revoked'
    function getStanceStatus(
        stance?: string,
    ): "success" | "error" | "warning" | "active" {
        switch (stance) {
            case "pro-strong":
                return "success";
            case "pro-weak":
                return "active";
            case "con-strong":
                return "error";
            case "con-weak":
                return "warning"; // using warning for weak con/neutral for now
            case "neutral":
                return "active";
            default:
                return "active";
        }
    }
</script>

<PageHead
    title={m.page_conversation_title()}
    description={m.page_conversation_description()}
/>

<BaseLayout>
    <div
        class="mx-auto flex h-[calc(100vh-100px)] max-w-5xl flex-col px-4 py-8"
    >
        <div class="mb-6 flex items-center justify-between">
            <CosmicButton
                href="/assignments"
                variant="secondary"
                className="!py-2 !px-3"
            >
                <ArrowLeft class="me-2 h-4 w-4" />
                {m.back()}
            </CosmicButton>

            {#if conversation}
                <div class="flex items-center gap-3">
                    <span
                        class="text-text-secondary text-sm font-medium tracking-widest uppercase"
                        >Status</span
                    >
                    <StatusBadge
                        status={conversation.state === "closed"
                            ? "revoked"
                            : "active"}
                    >
                        {conversation.state.toUpperCase()}
                    </StatusBadge>
                </div>
            {/if}
        </div>

        {#if loading && !conversation}
            <div
                class="flex h-full flex-col items-center justify-center py-24 text-center"
            >
                <div class="relative mb-8 h-20 w-20">
                    <div
                        class="border-brand-gold absolute inset-0 animate-spin rounded-full border-t-2"
                    ></div>
                    <div
                        class="animate-spin-slow absolute inset-2 rounded-full border-r-2 border-white/20"
                    ></div>
                </div>
                <p
                    class="animate-pulse font-serif text-xl tracking-wide text-white"
                >
                    {m.conversation_loading()}
                </p>
            </div>
        {:else if error && !conversation}
            <Alert
                color="red"
                class="border-status-error bg-status-error/10 border-l-4 text-white"
            >
                <span class="font-bold">{m.conversation_error()}:</span>
                {error}
            </Alert>
        {:else if conversation}
            <!-- Messages Container -->
            <GlassCard
                className="flex-1 mb-6 overflow-hidden flex flex-col relative !p-0"
            >
                <div
                    class="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-transparent via-transparent to-black/40"
                ></div>

                <div
                    class="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-brand-gold/20 flex-1 space-y-8 overflow-y-auto p-6"
                >
                    {#if conversation.turns.length === 0}
                        <div
                            class="flex h-full flex-col items-center justify-center text-center opacity-70"
                        >
                            <div
                                class="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5"
                            >
                                <Sparkles
                                    class="text-brand-gold h-8 w-8 animate-pulse"
                                />
                            </div>
                            <h3 class="mb-2 font-serif text-xl text-white">
                                Begin the Dialogue
                            </h3>
                            <p class="text-text-secondary max-w-md">
                                The prompt has been set. State your initial
                                argument to commence the dialectic process.
                            </p>
                        </div>
                    {:else}
                        {#each conversation.turns as turn (turn.id)}
                            {@const Icon = getTurnIcon(turn)}
                            {@const isUser =
                                getTurnLabel(turn) ===
                                m.conversation_turn_user()}

                            <div
                                class={`flex gap-4 ${isUser ? "flex-row-reverse" : ""} group animate-slide-up`}
                            >
                                <!-- Avatar -->
                                <div
                                    class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur-md ${
                                        isUser
                                            ? "bg-brand-gold/20 border-brand-gold/40 text-brand-gold"
                                            : "bg-canvas-accent/80 shadow-brand-gold/5 border-white/10 text-white"
                                    }`}
                                >
                                    <Icon class="h-5 w-5" />
                                </div>

                                <!-- Message Bubble -->
                                <div
                                    class={`max-w-[80%] flex-1 ${isUser ? "text-right" : ""}`}
                                >
                                    <div
                                        class={`mb-2 flex items-center gap-3 ${isUser ? "justify-end" : ""}`}
                                    >
                                        <span
                                            class="text-text-secondary/80 text-xs font-bold tracking-wider uppercase"
                                        >
                                            {getTurnLabel(turn)}
                                        </span>
                                        <span
                                            class="text-text-secondary/50 font-mono text-[10px]"
                                        >
                                            {formatTime(turn.createdAt)}
                                        </span>
                                        {#if turn.analysis?.stance}
                                            <StatusBadge
                                                status={getStanceStatus(
                                                    turn.analysis.stance,
                                                )}
                                            >
                                                {turn.analysis.stance}
                                            </StatusBadge>
                                        {/if}
                                    </div>

                                    <div
                                        class={`inline-block rounded-2xl border px-6 py-4 text-left shadow-xl backdrop-blur-sm ${
                                            isUser
                                                ? "from-brand-gold/10 to-brand-gold/5 border-brand-gold/20 rounded-tr-none bg-linear-to-br text-white"
                                                : "rounded-tl-none border-white/10 bg-white/5 text-gray-100 transition-colors hover:bg-white/10"
                                        }`}
                                    >
                                        <p
                                            class="text-base leading-relaxed font-light whitespace-pre-wrap"
                                        >
                                            {turn.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </GlassCard>

            <!-- Message Input -->
            <div class="relative z-20">
                {#if sendError}
                    <div class="animate-slide-up mb-4">
                        <Alert
                            color="red"
                            class="!bg-status-error/10 !text-status-error !border-status-error/20 !border"
                        >
                            <span class="font-bold">Error:</span>
                            {sendError}
                        </Alert>
                    </div>
                {/if}

                {#if conversation.state !== "closed"}
                    <GlassCard
                        className="!p-2 flex gap-2 items-end bg-black/40 backdrop-blur-xl border-t border-white/10"
                    >
                        <textarea
                            bind:value={messageInput}
                            placeholder={m.conversation_placeholder()}
                            rows="2"
                            disabled={sending}
                            class="scrollbar-hide flex-1 resize-none border-0 bg-transparent px-4 py-3 leading-relaxed font-light text-white placeholder-white/20 focus:ring-0"
                            onkeydown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        ></textarea>

                        <CosmicButton
                            on:click={handleSendMessage}
                            disabled={sending || !messageInput.trim()}
                            variant="primary"
                            className="!h-10 !w-10 !p-0 !rounded-xl !flex !items-center !justify-center mb-1 mr-1"
                        >
                            {#if sending}
                                <Spinner size="4" color="gray" />
                            {:else}
                                <Send class="h-4 w-4" />
                            {/if}
                        </CosmicButton>
                    </GlassCard>
                {:else}
                    <GlassCard
                        className="text-center py-6 border-brand-gold/20 bg-brand-gold/5"
                    >
                        <p class="text-brand-gold font-serif text-lg">
                            This dialogue has concluded.
                        </p>
                    </GlassCard>
                {/if}
            </div>
        {/if}
    </div>
</BaseLayout>
