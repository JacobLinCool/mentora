<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        className?: string;
        children?: Snippet;
    }

    let { className = "", children }: Props = $props();
</script>

<div class="card-glass animate-slide-up rounded-3xl p-6 {className}">
    {@render children?.()}
</div>
