<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/state";
    import { m } from "$lib/paraglide/messages";
    import { api, type Conversation, type Turn } from "$lib";
    import {
        Button,
        Card,
        Alert,
        Spinner,
        Textarea,
        Badge,
    } from "flowbite-svelte";
    import { ArrowLeft, Send, User, Bot } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";

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
            api.conversations.subscribe(conversationId, conversationState);
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

    function getStanceBadgeColor(stance?: string) {
        switch (stance) {
            case "pro-strong":
            case "pro-weak":
                return "green";
            case "con-strong":
            case "con-weak":
                return "red";
            case "neutral":
                return "blue";
            default:
                return "gray";
        }
    }
</script>

<PageHead
    title={m.page_conversation_title()}
    description={m.page_conversation_description()}
/>

<div class="mx-auto flex h-[calc(100vh-12rem)] max-w-4xl flex-col">
    <div class="mb-4">
        <Button href="/assignments" color="light">
            <ArrowLeft class="me-2 h-4 w-4" />
            {m.back()}
        </Button>
    </div>

    {#if loading && !conversation}
        <div class="py-12 text-center">
            <Spinner size="12" />
            <p class="mt-4 text-gray-600">{m.conversation_loading()}</p>
        </div>
    {:else if error && !conversation}
        <Alert color="red">{m.conversation_error()}: {error}</Alert>
    {:else if conversation}
        <!-- Conversation Header -->
        <Card class="mb-4 p-4">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-bold">{m.conversation_title()}</h1>
                <Badge
                    color={conversation.state === "closed" ? "gray" : "green"}
                >
                    {conversation.state}
                </Badge>
            </div>
        </Card>

        <!-- Messages Container -->
        <Card class="mb-4 flex-1 overflow-y-auto p-4">
            {#if conversation.turns.length === 0}
                <div class="py-8 text-center text-gray-500">
                    <p>
                        Start the conversation by typing your first message
                        below.
                    </p>
                </div>
            {:else}
                <div class="space-y-4">
                    {#each conversation.turns as turn (turn.id)}
                        {@const Icon = getTurnIcon(turn)}
                        {@const isUser =
                            getTurnLabel(turn) === m.conversation_turn_user()}

                        <div
                            class={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                        >
                            <div
                                class={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isUser ? "bg-blue-100" : "bg-gray-100"}`}
                            >
                                <Icon
                                    class={`h-5 w-5 ${isUser ? "text-blue-600" : "text-gray-600"}`}
                                />
                            </div>

                            <div class={`flex-1 ${isUser ? "text-right" : ""}`}>
                                <div class="mb-1 flex items-center gap-2">
                                    <span class="text-sm font-semibold"
                                        >{getTurnLabel(turn)}</span
                                    >
                                    <span class="text-xs text-gray-500"
                                        >{formatTime(turn.createdAt)}</span
                                    >
                                    {#if turn.analysis?.stance}
                                        <Badge
                                            color={getStanceBadgeColor(
                                                turn.analysis.stance,
                                            )}
                                        >
                                            {turn.analysis.stance}
                                        </Badge>
                                    {/if}
                                </div>
                                <div
                                    class={`inline-block rounded-lg px-4 py-2 ${isUser ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"}`}
                                >
                                    <p class="whitespace-pre-wrap">
                                        {turn.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </Card>

        <!-- Message Input -->
        <Card class="p-4">
            {#if sendError}
                <Alert color="red" class="mb-3">{sendError}</Alert>
            {/if}

            {#if conversation.state !== "closed"}
                <div class="flex gap-2">
                    <Textarea
                        bind:value={messageInput}
                        placeholder={m.conversation_placeholder()}
                        rows={3}
                        disabled={sending}
                        class="flex-1"
                        onkeydown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                    <Button
                        onclick={handleSendMessage}
                        disabled={sending || !messageInput.trim()}
                        color="blue"
                        class="self-end"
                    >
                        {#if sending}
                            <Spinner size="4" class="me-2" />
                        {:else}
                            <Send class="me-2 h-4 w-4" />
                        {/if}
                        {m.conversation_send()}
                    </Button>
                </div>
            {:else}
                <Alert color="yellow">
                    This conversation is {conversation.state}.
                </Alert>
            {/if}
        </Card>
    {/if}
</div>
