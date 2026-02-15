<script lang="ts">
    import { api } from "$lib";
    import StudentAnnouncements from "$lib/components/dashboard/student/StudentAnnouncements.svelte";
    import { isMentorMode } from "$lib/features/routing/role";
    import MentorAnnouncements from "./MentorAnnouncements.svelte";

    const isMentor = $derived(isMentorMode(api.currentUserProfile?.activeMode));
</script>

{#if isMentor}
    <MentorAnnouncements />
{:else}
    <div class="mx-auto max-w-md px-6 pt-8 md:max-w-2xl lg:max-w-4xl">
        <StudentAnnouncements />
    </div>
{/if}
