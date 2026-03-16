<script lang="ts">
    interface Props {
        entries: Array<{
            id: string;
            role: "ai" | "user";
            text: string;
        }>;
        visible?: boolean;
    }

    let { entries, visible = true }: Props = $props();

    let scrollContainer = $state<HTMLDivElement | null>(null);

    $effect(() => {
        if (visible && scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    });
</script>

{#if visible}
    <div class="history-panel" bind:this={scrollContainer}>
        {#if entries.length === 0}
            <div class="empty-state">目前還沒有對話紀錄。</div>
        {:else}
            {#each entries as entry (entry.id)}
                <div class="history-entry">
                    <div class="history-label">
                        {entry.role === "ai" ? "AI" : "YOU"}
                    </div>
                    <p class="history-text">{entry.text}</p>
                </div>
            {/each}
        {/if}
    </div>
{/if}

<style>
    .history-panel {
        height: 100%;
        min-height: 12rem;
        overflow-y: auto;
        padding-right: 0.25rem;
        opacity: 0;
        animation: fadeIn 0.5s ease-out forwards;
    }

    @keyframes fadeIn {
        to {
            opacity: 1;
        }
    }

    .history-panel::-webkit-scrollbar {
        width: 6px;
    }

    .history-panel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.18);
        border-radius: 999px;
    }

    .history-entry {
        margin-bottom: 1rem;
    }

    .history-label {
        margin-bottom: 0.4rem;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        color: rgba(255, 255, 255, 0.45);
    }

    .history-text {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.72;
        color: white;
        font-weight: 700;
        opacity: 0.88;
    }

    .empty-state {
        display: flex;
        height: 100%;
        min-height: 12rem;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: rgba(255, 255, 255, 0.45);
    }
</style>
