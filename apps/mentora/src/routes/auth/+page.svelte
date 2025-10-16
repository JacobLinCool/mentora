<script lang="ts">
    import { onMount } from "svelte";
    import { onAuthStateChanged, type User } from "firebase/auth";
    import { auth } from "$lib/firebase";
    import { m } from "$lib/paraglide/messages.js";
    import PageHead from "$lib/components/PageHead.svelte";
    import LoginCard from "$lib/components/auth/LoginCard.svelte";
    import UserProfile from "$lib/components/auth/UserProfile.svelte";

    let user = $state<User | null>(null);

    onMount(() => {
        const unsubAuth = onAuthStateChanged(auth, (u) => {
            user = u;
        });
        return () => {
            unsubAuth();
        };
    });
</script>

<PageHead title={m.page_auth_title()} description={m.page_auth_description()} />

{#if !user}
    <LoginCard />
{:else}
    <UserProfile {user} />
{/if}
