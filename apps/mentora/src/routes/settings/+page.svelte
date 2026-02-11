<script lang="ts">
    import { userProfile } from "$lib/temp.svelte";
    import MentorSettings from "./MentorSettings.svelte";
    import StudentSettings from "./StudentSettings.svelte";

    let props = $props();

    const isMentor = $derived(userProfile.isMentor);
</script>

{#if isMentor}
    <MentorSettings {...props} />
{:else}
    <StudentSettings {...props} />
{/if}
