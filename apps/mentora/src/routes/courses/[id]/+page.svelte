<script lang="ts">
    import MentorCourse from "./MentorCourse.svelte";
    import StudentCourse from "./StudentCourse.svelte";
    import { userProfile } from "$lib/temp.svelte";
    // import { api } from "$lib/api"; // Unused

    let props = $props();

    // Default to Student view for now
    let isMentor = $derived(userProfile.isMentor);
</script>

{#if isMentor}
    <MentorCourse {...props} />
{:else}
    <StudentCourse {...props} />
{/if}
