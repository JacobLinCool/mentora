<script lang="ts">
    import { userProfile } from "$lib/temp.svelte";
    import MentorCourse from "./MentorCourse.svelte";
    import StudentCourse from "./StudentCourse.svelte";
    // import { api } from "$lib/api"; // Unused

    let props = $props();

    const isMentor = $derived(userProfile.isMentor);
</script>

{#if isMentor}
    <MentorCourse {...props} />
{:else}
    <StudentCourse {...props} />
{/if}
