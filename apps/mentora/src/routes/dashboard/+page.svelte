<script lang="ts">
    import { api } from "$lib";
    import { getProfileMode, isMentorMode } from "$lib/features/routing/role";
    import { m } from "$lib/paraglide/messages";
    import { onMount } from "svelte";
    import MentorDashboard from "./MentorDashboard.svelte";
    import StudentDashboard from "./StudentDashboard.svelte";

    let props = $props();

    const role = $derived(getProfileMode(api.currentUserProfile));
    const isMentor = $derived(isMentorMode(role));

    let showDeviceModal = $state(false);

    onMount(() => {
        const alreadyShown = sessionStorage.getItem(
            "mentora:device-check-shown",
        );
        if (alreadyShown) return;

        const isMobile = window.innerWidth < 768;

        if ((isMentor && isMobile) || (!isMentor && !isMobile)) {
            showDeviceModal = true;
            sessionStorage.setItem("mentora:device-check-shown", "1");
        }
    });

    function dismissDeviceModal() {
        showDeviceModal = false;
    }
</script>

{#if showDeviceModal}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
        <div class="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
            <h2 class="mb-4 text-xl font-semibold text-gray-900">
                {m.device_recommendation_title()}
            </h2>
            <p class="mb-6 text-gray-600">
                {#if isMentor}
                    {m.device_recommendation_mentor_message()}
                {:else}
                    {m.device_recommendation_student_message()}
                {/if}
            </p>
            <button
                class="w-full cursor-pointer rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                onclick={dismissDeviceModal}
            >
                {m.device_recommendation_continue()}
            </button>
        </div>
    </div>
{/if}

{#if isMentor}
    <MentorDashboard {...props} />
{:else}
    <StudentDashboard {...props} />
{/if}
