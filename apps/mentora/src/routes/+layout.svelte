<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { api } from "$lib";
    import AuthLoader from "$lib/components/ui/AuthLoader.svelte";

    import { page } from "$app/state";
    import MeshGradient from "$lib/components/ui/MeshGradient.svelte";

    let { children } = $props();

    const authReady = $derived(api.authReady);

    // Check if we are in a conversation page (which handles its own background)
    // Adjust logic to check for 'conversations' in path
    const isConversationPage = $derived(
        page.url.pathname.includes("/conversations/"),
    );
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<!-- Global Static Background for non-conversation pages -->
{#if !isConversationPage}
    <MeshGradient
        animate={false}
        color1="#111827"
        color2="#ffffff"
        color3="#4b5563"
        color4="#d1d5db"
        color5="#1f2937"
    />
{/if}

<!-- Global Auth Check -->
{#await authReady}
    <AuthLoader />
{:then}
    {@render children?.()}
{/await}
