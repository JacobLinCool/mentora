<script lang="ts">
    import { api } from "$lib";
    import { isMentorMode } from "$lib/features/routing/role";
    import MentorSettings from "./MentorSettings.svelte";
    import StudentSettings from "./StudentSettings.svelte";

    let props = $props();

    const isMentor = $derived(isMentorMode(api.currentUserProfile?.activeMode));
</script>

{#if isMentor}
    <MentorSettings {...props} />
{:else}
    <StudentSettings {...props} />
{/if}
