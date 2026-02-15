<script lang="ts">
    import { api } from "$lib";
    import StudentNotifications from "$lib/components/dashboard/student/StudentNotifications.svelte";
    import { isMentorMode } from "$lib/features/routing/role";
    import MentorNotifications from "./MentorNotifications.svelte";

    const isMentor = $derived(isMentorMode(api.currentUserProfile?.activeMode));
</script>

{#if isMentor}
    <MentorNotifications />
{:else}
    <div class="mx-auto max-w-md px-6 pt-8 md:max-w-2xl lg:max-w-4xl">
        <StudentNotifications />
    </div>
{/if}
