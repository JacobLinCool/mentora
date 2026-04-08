<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api, type Announcement } from "$lib/api";
    import { m } from "$lib/paraglide/messages";
    import { Bell, ChevronRight, Megaphone } from "@lucide/svelte";
    import { formatMentoraDateTime } from "$lib/features/datetime/format";
    import posthog from "posthog-js";

    const announcementsState = api.createState<Announcement[]>();
    const announcements = $derived(announcementsState.value || []);
    let actionError = $state<string | null>(null);

    function getIcon(type: Announcement["type"]) {
        if (type === "course_announcement") return Megaphone;
        return Bell;
    }

    function formatTime(createdAt: number) {
        return formatMentoraDateTime(createdAt);
    }

    async function openAnnouncement(announcement: Announcement) {
        actionError = null;
        try {
            posthog.capture("announcement_opened", {
                announcement_id: announcement.id,
                course_id: announcement.payload.courseId,
                type: announcement.type,
                source: "student_dashboard",
                already_read: announcement.isRead,
            });
            if (!announcement.isRead) {
                const result = await api.announcements.markRead(
                    announcement.id,
                );
                if (!result.success) {
                    actionError = result.error;
                    console.error(
                        "Failed to mark announcement as read",
                        result.error,
                    );
                }
            }

            if (announcement.type === "course_announcement") {
                await goto(
                    resolve(`/courses/${announcement.payload.courseId}`),
                );
            }
        } catch (error) {
            actionError =
                error instanceof Error ? error.message : m.error_generic();
            console.error("Failed to open announcement", error);
        }
    }

    onMount(() => {
        let cancelled = false;

        const subscribe = () => {
            api.announcementsSubscribe.subscribeToMine(announcementsState, {
                limit: 5,
            });
        };

        api.authReady.then(() => {
            if (!cancelled && api.isAuthenticated) {
                subscribe();
            }
        });

        return () => {
            cancelled = true;
            announcementsState.cleanup();
        };
    });
</script>

<div class="mb-6">
    <div class="flex items-center justify-between">
        <h2 class="text-text-primary font-serif-tc text-2xl font-bold">
            {m.announcements_title()}
        </h2>
    </div>

    {#if announcementsState.error || actionError}
        <div
            class="mb-3 rounded-xl border border-red-300/50 bg-red-100/90 px-3 py-2 text-xs text-red-800"
        >
            {actionError || announcementsState.error}
        </div>
    {/if}

    {#if announcements.length > 0}
        <div class="rounded-3xl bg-[#5f5f5f] p-4">
            {#each announcements as announcement (announcement.id)}
                {@const Icon = getIcon(announcement.type)}
                <button
                    class="student-panel-hover student-clickable group flex w-full items-start gap-3 rounded-2xl bg-transparent p-3 text-left"
                    onclick={() => openAnnouncement(announcement)}
                >
                    <div
                        class={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            announcement.isRead ? "text-white/50" : "text-white"
                        }`}
                    >
                        <Icon class="h-4 w-4" />
                    </div>

                    <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-2">
                            <h3 class="text-sm font-medium text-white/95">
                                {announcement.payload.courseTitle}
                            </h3>
                            <span class="text-xs text-white/40">
                                {formatTime(announcement.createdAt)}
                            </span>
                        </div>
                        <p
                            class="mt-0.5 line-clamp-2 text-xs font-light text-white/65"
                        >
                            {announcement.payload.contentPreview}
                        </p>
                    </div>

                    <div class="mt-1 flex items-center gap-2">
                        {#if !announcement.isRead}
                            <span class="h-1.5 w-1.5 rounded-full bg-white"
                            ></span>
                        {/if}
                        <ChevronRight
                            class="h-4 w-4 shrink-0 text-white/45 transition group-hover:text-white/75"
                        />
                    </div>
                </button>
            {/each}
        </div>
    {:else}
        <div
            class="flex min-h-20 flex-col items-center justify-center gap-2 py-3 text-center"
        >
            <p class="text-sm text-white">{m.announcements_empty()}</p>
        </div>
    {/if}
</div>
