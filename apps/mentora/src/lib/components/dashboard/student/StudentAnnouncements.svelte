<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api, type Announcement } from "$lib/api";
    import { m } from "$lib/paraglide/messages";
    import { Bell, Megaphone } from "@lucide/svelte";
    import { formatMentoraDateTime } from "$lib/features/datetime/format";

    const announcementsState = api.createState<Announcement[]>();
    const announcements = $derived(announcementsState.value || []);

    function getIcon(type: Announcement["type"]) {
        if (type === "course_announcement") return Megaphone;
        return Bell;
    }

    function formatTime(createdAt: number) {
        return formatMentoraDateTime(createdAt);
    }

    async function openAnnouncement(announcement: Announcement) {
        if (!announcement.isRead) {
            await api.announcements.markRead(announcement.id);
        }

        if (announcement.type === "course_announcement") {
            await goto(resolve(`/courses/${announcement.payload.courseId}`));
        }
    }

    onMount(() => {
        let cancelled = false;

        const subscribe = () => {
            api.announcementsSubscribe.subscribeToMine(announcementsState, {
                limit: 5,
            });
        };

        if (api.isAuthenticated) {
            subscribe();
        } else {
            api.authReady.then(() => {
                if (!cancelled && api.isAuthenticated) {
                    subscribe();
                }
            });
        }

        return () => {
            cancelled = true;
            announcementsState.cleanup();
        };
    });
</script>

<div
    class="mb-6 rounded-3xl border border-white/10 bg-[#4C4C4C] p-6 backdrop-blur-md"
>
    <div class="mb-4 flex items-center justify-between">
        <h2
            class="font-serif-tc text-text-secondary text-sm tracking-wide uppercase"
        >
            {m.announcements_title()}
        </h2>
    </div>

    <div class="space-y-4">
        {#each announcements as announcement (announcement.id)}
            <button
                class="group flex w-full items-start gap-4 text-left transition-opacity hover:opacity-80"
                onclick={() => openAnnouncement(announcement)}
            >
                <div
                    class={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        announcement.isRead
                            ? "bg-white/5 text-white/40"
                            : "bg-yellow-100 text-yellow-700"
                    }`}
                >
                    <svelte:component
                        this={getIcon(announcement.type)}
                        class="h-4 w-4"
                    />
                </div>

                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="text-sm font-medium text-white">
                            {announcement.payload.courseTitle}
                        </h3>
                        <span class="text-xs text-white/40">
                            {formatTime(announcement.createdAt)}
                        </span>
                    </div>
                    <p
                        class="mt-0.5 line-clamp-2 text-xs font-light text-white/60"
                    >
                        {announcement.payload.contentPreview}
                    </p>
                </div>
            </button>
        {/each}

        {#if announcements.length === 0}
            <div class="py-4 text-center text-sm text-white/30 italic">
                {m.announcements_empty()}
            </div>
        {/if}
    </div>
</div>
