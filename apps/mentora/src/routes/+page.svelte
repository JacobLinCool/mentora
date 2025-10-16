<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import PageHead from "$lib/components/PageHead.svelte";
    import LandingPage from "$lib/components/home/LandingPage.svelte";
    import LoggedInHome from "$lib/components/home/LoggedInHome.svelte";

    const currentUser = $derived(api.currentUser);
</script>

<PageHead title={m.page_home_title()} description={m.page_home_description()} />

{#if currentUser}
    <LoggedInHome />
{:else}
    <LandingPage />
{/if}
