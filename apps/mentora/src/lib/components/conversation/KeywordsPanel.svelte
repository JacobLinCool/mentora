<script lang="ts">
    interface Props {
        keywords: string[];
        visible?: boolean;
    }

    let { keywords, visible = true }: Props = $props();

    // Pre-defined positions for scattered layout (organic and varied)
    const positions = [
        { left: "5%", top: "0%", size: "small" },
        { left: "60%", top: "5%", size: "small" },
        { left: "10%", top: "25%", size: "large" },
        { left: "65%", top: "35%", size: "small" },
        { left: "2%", top: "55%", size: "medium" },
    ];
</script>

{#if visible}
    <div class="keywords-panel">
        {#each keywords as keyword, i (keyword)}
            {@const pos = positions[i % positions.length]}
            <span
                class="keyword {pos.size}"
                style="left: {pos.left}; top: {pos.top};"
            >
                {keyword}
            </span>
        {/each}
    </div>
{/if}

<style>
    .keywords-panel {
        position: relative;
        width: 100%;
        height: 200px;
        opacity: 0;
        animation: fadeIn 0.5s ease-out forwards;
    }

    @keyframes fadeIn {
        to {
            opacity: 1;
        }
    }

    .keyword {
        position: absolute;
        color: white;
        font-family: "Noto Serif TC", serif;
        font-weight: 500;
        opacity: 0.9;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .keyword.small {
        font-size: 1rem;
    }

    .keyword.medium {
        font-size: 1.25rem;
    }

    .keyword.large {
        font-size: 1.5rem;
        font-weight: 600;
    }
</style>
