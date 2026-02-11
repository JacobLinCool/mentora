<script lang="ts">
    import { userProfile } from "$lib/temp.svelte";
    import MentorDashboard from "./MentorDashboard.svelte";
    import StudentDashboard from "./StudentDashboard.svelte";

    let props = $props();

    const isMentor = $derived(userProfile.isMentor);
</script>

{#if isMentor}
    <MentorDashboard {...props} />
{:else}
    <StudentDashboard {...props} />
{/if}
