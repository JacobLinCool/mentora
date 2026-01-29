<script lang="ts">
    import MentorCourse from "./MentorCourse.svelte";
    import StudentCourse from "./StudentCourse.svelte";
    // import { api } from "$lib/api";

    let props = $props();

    // TODO: Implement actual role check when backend supports it
    // For now, default to Student view
    const isMentor = false;
    // const isMentor = $derived(api.currentUser?.role === 'instructor');
</script>

{#if isMentor}
    <MentorCourse {...props} />
{:else}
    <StudentCourse {...props} />
{/if}
