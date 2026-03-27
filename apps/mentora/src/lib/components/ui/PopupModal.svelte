<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import type { Snippet } from "svelte";

    interface Props {
        open: boolean;
        title?: string;
        size?: "xs" | "sm" | "md" | "lg" | "xl";
        preventCloseOnOutside?: boolean;
        children: Snippet;
        footer?: Snippet;
    }

    let {
        open = $bindable(false),
        title = "",
        size = "md",
        preventCloseOnOutside = false,
        children,
        footer,
    }: Props = $props();

    const modalClasses = {
        header: "popup-modal-header",
        body: "popup-modal-body",
        footer: "popup-modal-footer",
        close: "popup-modal-close",
    };
</script>

<Modal
    bind:open
    {title}
    {size}
    {footer}
    classes={modalClasses}
    autoclose={false}
    outsideclose={!preventCloseOnOutside}
    dismissable={!preventCloseOnOutside}
    permanent={preventCloseOnOutside}
    class="popup-modal"
>
    <div class="popup-modal-content">
        {@render children()}
    </div>
</Modal>

<style>
    :global(dialog.popup-modal::backdrop) {
        background-color: rgba(17, 17, 17, 0.42) !important;
        backdrop-filter: blur(2px);
    }

    :global(dialog.popup-modal) {
        background-color: #f5f5f5 !important;
        color: #2f2f2f !important;
        border: 1px solid rgba(95, 95, 95, 0.14) !important;
        border-radius: 1.25rem !important;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18) !important;
    }

    :global(dialog.popup-modal .popup-modal-header) {
        border-bottom: 1px solid rgba(95, 95, 95, 0.12) !important;
        background-color: #f5f5f5 !important;
        color: #2f2f2f !important;
    }

    :global(dialog.popup-modal .popup-modal-header h3) {
        color: #2f2f2f !important;
        font-weight: 700 !important;
    }

    :global(dialog.popup-modal .popup-modal-body) {
        background-color: #f5f5f5 !important;
        color: #2f2f2f !important;
    }

    :global(dialog.popup-modal .popup-modal-footer) {
        border-top: 1px solid rgba(95, 95, 95, 0.12) !important;
        background-color: #f5f5f5 !important;
    }

    :global(dialog.popup-modal .popup-modal-close) {
        cursor: pointer !important;
        border-radius: 9999px !important;
        color: #7a7a7a !important;
    }

    :global(dialog.popup-modal .popup-modal-close:hover) {
        background-color: rgba(95, 95, 95, 0.08) !important;
        color: #4b4b4b !important;
    }

    :global(dialog.popup-modal input),
    :global(dialog.popup-modal select),
    :global(dialog.popup-modal textarea) {
        background-color: #ffffff !important;
        color: #2f2f2f !important;
        border-color: rgba(95, 95, 95, 0.22) !important;
        border-radius: 0.9rem !important;
    }

    :global(dialog.popup-modal input::placeholder),
    :global(dialog.popup-modal textarea::placeholder) {
        color: #9a9a9a !important;
    }

    :global(dialog.popup-modal select option) {
        background-color: #ffffff;
        color: #2f2f2f;
    }

    .popup-modal-content {
        padding: 0.25rem 0;
    }

    :global(dialog.popup-modal input:focus),
    :global(dialog.popup-modal select:focus),
    :global(dialog.popup-modal textarea:focus) {
        --tw-ring-color: #5f5f5f !important;
        border-color: #5f5f5f !important;
        box-shadow: 0 0 0 1px #5f5f5f !important;
    }
</style>
