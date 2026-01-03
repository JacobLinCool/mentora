<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        status?: "active" | "revoked" | "error" | "success" | "warning";
        className?: string;
        children?: Snippet;
    }

    let { status = "active", className = "", children }: Props = $props();

    const styles = {
        active: "bg-status-success/10 text-status-success border-status-success/20",
        success:
            "bg-status-success/10 text-status-success border-status-success/20",
        revoked:
            "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
        error: "bg-status-error/10 text-status-error border-status-error/20",
        warning: "bg-brand-gold/10 text-brand-gold border-brand-gold/20",
    };
</script>

<span
    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {styles[
        status
    ]} {className}"
>
    {@render children?.()}
</span>
