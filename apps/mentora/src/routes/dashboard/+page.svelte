<script lang="ts">
    import MentorDashboard from "./MentorDashboard.svelte";
    import StudentDashboard from "./StudentDashboard.svelte";
    // import { userProfile } from "$lib/temp.svelte";

    let props = $props();

    // Mock role check until backend is ready
    const isMentor = false;
</script>

{#if isMentor}
    <MentorDashboard {...props} />
{:else}
    <StudentDashboard {...props} />
{/if}
