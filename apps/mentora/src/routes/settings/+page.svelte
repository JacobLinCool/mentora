<script lang="ts">
    import { api } from "$lib";
    import { getProfileMode, isMentorMode } from "$lib/features/routing/role";
    import MentorSettings from "./MentorSettings.svelte";
    import StudentSettings from "./StudentSettings.svelte";

    let props = $props();

    const isMentor = $derived(
        isMentorMode(getProfileMode(api.currentUserProfile)),
    );
</script>

{#if isMentor}
    <MentorSettings {...props} />
{:else}
    <StudentSettings {...props} />
{/if}
