<script lang="ts">
    import MentorCourse from "./MentorCourse.svelte";
    import StudentCourse from "./StudentCourse.svelte";
    import { userProfile } from "$lib/temp.svelte";

    let props = $props();
</script>

{#if userProfile.isMentor}
    <MentorCourse {...props} />
{:else}
    <StudentCourse {...props} />
{/if}
