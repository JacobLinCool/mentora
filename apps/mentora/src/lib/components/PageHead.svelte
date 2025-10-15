<script lang="ts">
    interface Props {
        title: string;
        description?: string;
    }

    let { title, description }: Props = $props();
</script>

<svelte:head>
    <title>{title} - Mentora</title>
    {#if description}
        <meta name="description" content={description} />
        <meta property="og:description" content={description} />
    {/if}
    <meta property="og:title" content="{title} - Mentora" />
    <meta property="og:type" content="website" />
</svelte:head>
