<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { api } from "$lib";
    import AuthLoader from "$lib/components/ui/AuthLoader.svelte";

    let { children } = $props();

    const authReady = $derived(api.authReady);
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<!-- Global Auth Check -->
{#await authReady}
    <AuthLoader />
{:then}
    {@render children?.()}
{/await}
