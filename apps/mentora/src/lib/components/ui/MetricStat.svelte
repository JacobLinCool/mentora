<script lang="ts">
    interface Props {
        label: string;
        value: string | number;
        subtext?: string;
    }

    let { label, value, subtext = undefined }: Props = $props();
</script>

<div class="flex flex-col">
    <span
        class="text-text-secondary mb-1 text-sm font-medium tracking-wide uppercase"
        >{label}</span
    >
    <span class="text-text-primary font-serif text-4xl tracking-tight"
        >{value}</span
    >
    {#if subtext}
        <span class="text-text-secondary/60 mt-1 text-xs">{subtext}</span>
    {/if}
</div>
