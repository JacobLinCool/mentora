<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import type { Snippet } from "svelte";

    interface Props {
        open: boolean;
        title?: string;
        size?: "xs" | "sm" | "md" | "lg" | "xl";
        children: Snippet;
        footer?: Snippet;
    }

    let {
        open = $bindable(false),
        title = "",
        size = "md",
        children,
        footer,
    }: Props = $props();
</script>

<Modal bind:open {title} {size} autoclose={false} class="popup-modal">
    <div class="popup-modal-content">
        {@render children()}
    </div>
    {#if footer}
        <div class="popup-modal-footer border-t border-gray-200 pt-4">
            {@render footer()}
        </div>
    {/if}
</Modal>

<style>
    :global(.popup-modal .bg-white) {
        background-color: #f5f5f5 !important;
        border-radius: 12px !important;
    }

    .popup-modal-content {
        padding: 0.5rem 0;
    }

    .popup-modal-footer {
        margin-top: 1rem;
    }

    :global(.popup-modal input:focus),
    :global(.popup-modal select:focus),
    :global(.popup-modal textarea:focus) {
        --tw-ring-color: #494949 !important;
        border-color: #494949 !important;
        box-shadow: 0 0 0 1px #494949 !important;
    }
</style>
