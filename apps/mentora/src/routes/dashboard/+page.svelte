<script lang="ts">
    import MentorDashboard from "./MentorDashboard.svelte";
    import StudentDashboard from "./StudentDashboard.svelte";
    import { userProfile } from "$lib/temp.svelte";

    let props = $props();
</script>

{#if userProfile.isMentor}
    <MentorDashboard {...props} />
{:else}
    <StudentDashboard {...props} />
{/if}
