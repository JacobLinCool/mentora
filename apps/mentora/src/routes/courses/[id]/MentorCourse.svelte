<script lang="ts">
    import { page } from "$app/state";
    import MentorCourseLayout from "$lib/components/course/mentor/MentorCourseLayout.svelte";
    import CourseDashboard from "$lib/components/course/mentor/CourseDashboard.svelte";
    import CourseTopics from "$lib/components/course/mentor/CourseTopics.svelte";
    import CourseMembers from "$lib/components/course/mentor/CourseMembers.svelte";
    import CourseSettings from "$lib/components/course/mentor/CourseSettings.svelte";
    import { onMount } from "svelte";
    import { api } from "$lib";
    import type { Course } from "$lib/api";
    import { formatMentoraDateTime } from "$lib/features/datetime/format";
    import { startVisibilityPolling } from "$lib/features/polling/visibility";

    // Props
    const courseId = $derived(page.params.id);

    // State
    let activeTab = $state("dashboard"); // dashboard, topics, members, settings
    let courseTitle = $state("Loading...");
    let fullCourse = $state<Course | null>(null);

    interface Announcement {
        id: string;
        title: string;
        createdDate: string;
        [key: string]: unknown;
    }
    let announcements = $state<Announcement[]>([]);

    async function loadCourseData() {
        if (courseId) {
            const courseResult = await api.courses.get(courseId);
            if (courseResult.success) {
                fullCourse = courseResult.data;
                courseTitle = courseResult.data.title;
                // Map API announcements to UI format
                announcements = (courseResult.data.announcements || []).map(
                    (a) => {
                        // Try to extract title from bolded first line
                        const content = a.content || "";
                        let title = "";
                        // Simple parser for **Title**\nContent
                        const match = content.match(/^\*\*(.*?)\*\*\n/);
                        if (match && match[1]) {
                            title = match[1];
                        } else {
                            title =
                                content.substring(0, 50) +
                                (content.length > 50 ? "..." : "");
                        }

                        return {
                            id: a.id,
                            title,
                            // Store original content for editing if needed, but UI separates them
                            // We need to parse content body
                            content: match
                                ? content.replace(match[0], "")
                                : content,
                            createdDate: formatDate(a.createdAt),
                        };
                    },
                ) as Announcement[];
            }
        }
    }

    function formatDate(
        ts: number | Date | { toDate: () => Date } | null | undefined,
    ) {
        return formatMentoraDateTime(ts);
    }

    onMount(() => {
        const stopPolling = startVisibilityPolling(() => loadCourseData(), {
            intervalMs: 5000,
            runImmediately: true,
            onError: (error) =>
                console.error("Failed to refresh course", error),
        });
        return () => stopPolling();
    });

    function handleTabChange(tab: string) {
        activeTab = tab;
    }

    async function handleSaveAnnouncement(
        id: string | number | null,
        title: string,
        content: string,
    ) {
        if (!courseId || !fullCourse) return;

        const currentAnnouncements = fullCourse.announcements || [];
        const now = Date.now();
        const formattedContent = `**${title}**\n${content}`;

        let newAnnouncements = [...currentAnnouncements];

        if (id) {
            // Edit
            newAnnouncements = newAnnouncements.map((a) =>
                a.id === id
                    ? { ...a, content: formattedContent, updatedAt: now }
                    : a,
            );
        } else {
            // Create
            newAnnouncements.push({
                id: crypto.randomUUID(),
                content: formattedContent,
                createdAt: now,
                updatedAt: now,
            });
        }

        const res = await api.courses.update(courseId, {
            announcements: newAnnouncements,
        });

        if (res.success) {
            loadCourseData();
        }
    }

    async function handleDeleteAnnouncement(id: string | number) {
        if (!courseId || !fullCourse) return;

        const currentAnnouncements = fullCourse.announcements || [];
        const newAnnouncements = currentAnnouncements.filter(
            (a) => a.id !== id,
        );

        const res = await api.courses.update(courseId, {
            announcements: newAnnouncements,
        });

        if (res.success) {
            loadCourseData();
        }
    }
</script>

<MentorCourseLayout {activeTab} onTabChange={handleTabChange} {courseTitle}>
    {#if activeTab === "dashboard"}
        <CourseDashboard
            {announcements}
            onSave={handleSaveAnnouncement}
            onDelete={handleDeleteAnnouncement}
        />
    {:else if activeTab === "topics" && courseId}
        <CourseTopics {courseId} />
    {:else if activeTab === "members" && courseId}
        <CourseMembers {courseId} />
    {:else if activeTab === "settings"}
        <CourseSettings />
    {/if}
</MentorCourseLayout>
