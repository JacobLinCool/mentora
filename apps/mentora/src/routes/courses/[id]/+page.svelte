<script lang="ts">
    import { page } from "$app/state";
    import { api } from "$lib/api";
    import MentorCourse from "./MentorCourse.svelte";
    import StudentCourse from "./StudentCourse.svelte";

    let props = $props();
    const courseId = $derived(page.params.id);
    let canAccessMentorView = $state(false);
    let roleResolved = $state(false);

    $effect(() => {
        let cancelled = false;
        roleResolved = false;
        canAccessMentorView = false;

        void (async () => {
            if (!courseId) {
                canAccessMentorView = false;
                roleResolved = true;
                return;
            }

            await api.authReady;
            if (!api.isAuthenticated) {
                canAccessMentorView = false;
                roleResolved = true;
                return;
            }

            const courseResult = await api.courses.get(courseId);
            if (!courseResult.success) {
                if (!cancelled) {
                    canAccessMentorView = false;
                    roleResolved = true;
                }
                return;
            }

            const currentUserId = api.currentUser?.uid;
            if (
                currentUserId &&
                courseResult.data.ownerId &&
                courseResult.data.ownerId === currentUserId
            ) {
                if (!cancelled) {
                    canAccessMentorView = true;
                    roleResolved = true;
                }
                return;
            }

            const rosterResult = await api.courses.getRoster(courseId);
            if (!cancelled && rosterResult.success) {
                const membership = rosterResult.data.find(
                    (member) =>
                        member.userId === currentUserId &&
                        member.status === "active",
                );
                canAccessMentorView =
                    membership?.role === "instructor" ||
                    membership?.role === "ta";
            } else if (!cancelled) {
                canAccessMentorView = false;
            }

            if (!cancelled) {
                roleResolved = true;
            }
        })();

        return () => {
            cancelled = true;
        };
    });
</script>

{#if !roleResolved}
    <div class="p-6 text-center text-gray-500">Loading course...</div>
{:else if canAccessMentorView}
    <MentorCourse {...props} />
{:else}
    <StudentCourse {...props} />
{/if}
