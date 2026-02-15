<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { m } from "$lib/paraglide/messages";
    import MentorLayout from "$lib/components/layout/mentor/MentorLayout.svelte";
    import { api, type Announcement } from "$lib/api";
    import { Bell, CheckCheck, Clock, Megaphone } from "@lucide/svelte";
    import { formatMentoraDateTime } from "$lib/features/datetime/format";

    const announcementsState = api.createState<Announcement[]>();
    const announcements = $derived(announcementsState.value || []);
    const unreadCount = $derived(
        announcements.reduce(
            (count, announcement) => count + (announcement.isRead ? 0 : 1),
            0,
        ),
    );

    const todayAnnouncements = $derived(
        announcements.filter((announcement) => isToday(announcement.createdAt)),
    );
    const earlierAnnouncements = $derived(
        announcements.filter(
            (announcement) => !isToday(announcement.createdAt),
        ),
    );

    function isToday(timestamp: number): boolean {
        const now = new Date();
        const date = new Date(timestamp);
        return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
        );
    }

    function getIcon(type: Announcement["type"]) {
        if (type === "course_announcement") return Megaphone;
        return Bell;
    }

    function getTypeLabel(type: Announcement["type"]) {
        if (type === "course_announcement") {
            return m.announcements_type_course_announcement();
        }
        return m.announcements_title();
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

    async function markAllRead() {
        if (unreadCount === 0) return;
        await api.announcements.markAllRead();
    }

    onMount(() => {
        let cancelled = false;

        const subscribe = () => {
            api.announcementsSubscribe.subscribeToMine(announcementsState, {
                limit: 200,
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

<MentorLayout>
    <div class="mx-auto max-w-5xl px-8 pt-12 pb-24">
        <div class="mb-12 flex items-center justify-between gap-4">
            <div>
                <h1 class="font-serif-tc text-4xl font-bold tracking-tight">
                    {m.announcements_title()}
                </h1>
            </div>

            <button
                type="button"
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                disabled={unreadCount === 0}
                onclick={markAllRead}
            >
                <CheckCheck class="h-4 w-4" />
                {m.announcements_mark_all_read()}
            </button>
        </div>

        {#if announcementsState.error}
            <div
                class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
                {announcementsState.error}
            </div>
        {:else}
            <div class="space-y-8">
                <div>
                    <h2
                        class="mb-4 text-xs font-medium tracking-wider text-gray-600 uppercase"
                    >
                        {m.announcements_today()}
                    </h2>

                    <div class="space-y-3">
                        {#if todayAnnouncements.length === 0}
                            <div
                                class="rounded-xl bg-white py-10 text-center text-sm text-gray-500 shadow-sm"
                            >
                                {m.announcements_empty()}
                            </div>
                        {:else}
                            {#each todayAnnouncements as announcement (announcement.id)}
                                <button
                                    type="button"
                                    class={`group relative w-full overflow-hidden rounded-xl p-5 text-left shadow-sm transition-colors hover:bg-[#F5F5F5] ${
                                        announcement.isRead
                                            ? "bg-white"
                                            : "bg-[#FFF9E8]"
                                    }`}
                                    onclick={() =>
                                        openAnnouncement(announcement)}
                                >
                                    <div class="flex items-start gap-5">
                                        <div
                                            class={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                                announcement.isRead
                                                    ? "bg-gray-100 text-gray-600"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}
                                        >
                                            <svelte:component
                                                this={getIcon(
                                                    announcement.type,
                                                )}
                                                class="h-5 w-5"
                                            />
                                        </div>

                                        <div class="min-w-0 flex-1">
                                            <div
                                                class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
                                            >
                                                <div class="min-w-0">
                                                    <p
                                                        class="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                                    >
                                                        {getTypeLabel(
                                                            announcement.type,
                                                        )}
                                                    </p>
                                                    <h3
                                                        class="mt-1 text-lg font-medium text-gray-900"
                                                    >
                                                        {announcement.payload
                                                            .courseTitle}
                                                    </h3>
                                                </div>
                                                <span
                                                    class="flex items-center gap-1 text-xs text-gray-500"
                                                >
                                                    <Clock class="h-3 w-3" />
                                                    {formatTime(
                                                        announcement.createdAt,
                                                    )}
                                                </span>
                                            </div>

                                            <p
                                                class="mt-1 leading-relaxed text-gray-600"
                                            >
                                                {announcement.payload
                                                    .contentPreview}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            {/each}
                        {/if}
                    </div>
                </div>

                <div>
                    <h2
                        class="mb-4 text-xs font-medium tracking-wider text-gray-600 uppercase"
                    >
                        {m.announcements_earlier()}
                    </h2>

                    <div class="space-y-3">
                        {#if earlierAnnouncements.length === 0}
                            <div
                                class="rounded-xl bg-white py-12 text-center text-sm text-gray-500 shadow-sm"
                            >
                                {m.announcements_empty_earlier()}
                            </div>
                        {:else}
                            {#each earlierAnnouncements as announcement (announcement.id)}
                                <button
                                    type="button"
                                    class="group relative w-full overflow-hidden rounded-xl bg-white p-5 text-left shadow-sm transition-colors hover:bg-[#F5F5F5]"
                                    onclick={() =>
                                        openAnnouncement(announcement)}
                                >
                                    <div class="flex items-start gap-5">
                                        <div
                                            class="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600"
                                        >
                                            <svelte:component
                                                this={getIcon(
                                                    announcement.type,
                                                )}
                                                class="h-5 w-5"
                                            />
                                        </div>

                                        <div class="min-w-0 flex-1">
                                            <div
                                                class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
                                            >
                                                <div class="min-w-0">
                                                    <p
                                                        class="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                                    >
                                                        {getTypeLabel(
                                                            announcement.type,
                                                        )}
                                                    </p>
                                                    <h3
                                                        class="mt-1 text-lg font-medium text-gray-900"
                                                    >
                                                        {announcement.payload
                                                            .courseTitle}
                                                    </h3>
                                                </div>
                                                <span
                                                    class="flex items-center gap-1 text-xs text-gray-500"
                                                >
                                                    <Clock class="h-3 w-3" />
                                                    {formatTime(
                                                        announcement.createdAt,
                                                    )}
                                                </span>
                                            </div>

                                            <p
                                                class="mt-1 leading-relaxed text-gray-600"
                                            >
                                                {announcement.payload
                                                    .contentPreview}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</MentorLayout>
