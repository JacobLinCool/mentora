<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
        href?: string;
        type?: "button" | "submit" | "reset";
        className?: string;
        children?: Snippet;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    }

    let {
        variant = "primary",
        href = undefined,
        type = "button",
        className = "",
        children,
        ...rest
    }: Props = $props();

    const baseStyles =
        "flex items-center justify-center gap-3 px-6 py-4 rounded-xl border transition-all duration-300 group cursor-pointer font-medium";

    const variants = {
        primary:
            "bg-glass-border/10 border-glass-border text-white hover:bg-glass-highlight hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 hover:border-white/20",
        secondary:
            "bg-transparent border-transparent text-text-secondary hover:text-white hover:bg-white/5",
        danger: "bg-status-error/10 border-status-error/20 text-status-error hover:bg-status-error/20 hover:-translate-y-0.5",
        ghost: "bg-transparent border-transparent text-text-secondary hover:text-white hover:bg-white/5",
        success:
            "bg-status-success/10 border-status-success/20 text-status-success hover:bg-status-success/20 hover:-translate-y-0.5",
    };

    let classes = $derived(`${baseStyles} ${variants[variant]} ${className}`);
</script>

{#if href}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a {href} class={classes} {...rest}>
        {@render children?.()}
    </a>
{:else}
    <button {type} class={classes} {...rest}>
        {@render children?.()}
    </button>
{/if}
