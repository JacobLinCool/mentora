<script lang="ts">
    import MentorDashboard from "./MentorDashboard.svelte";
    import StudentDashboard from "./StudentDashboard.svelte";

    let props = $props();

    // Default to Student view for now
    const isMentor = true;
</script>

{#if isMentor}
    <MentorDashboard {...props} />
{:else}
    <StudentDashboard {...props} />
{/if}
