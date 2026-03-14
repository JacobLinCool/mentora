<script lang="ts">
    import { api } from "$lib";
    import { getProfileMode, isMentorMode } from "$lib/features/routing/role";
    import MentorDashboard from "./MentorDashboard.svelte";
    import StudentDashboard from "./StudentDashboard.svelte";

    let props = $props();

    const isMentor = $derived(
        isMentorMode(getProfileMode(api.currentUserProfile)),
    );
</script>

{#if isMentor}
    <MentorDashboard {...props} />
{:else}
    <StudentDashboard {...props} />
{/if}
