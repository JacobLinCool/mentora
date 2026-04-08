<script lang="ts">
    import { page } from "$app/state";
    import MentorCourseLayout from "$lib/components/course/mentor/MentorCourseLayout.svelte";
    import CourseDashboard from "$lib/components/course/mentor/CourseDashboard.svelte";
    import CourseTopics from "$lib/components/course/mentor/CourseTopics.svelte";
    import CourseMembers from "$lib/components/course/mentor/CourseMembers.svelte";
    import CourseSettings from "$lib/components/course/mentor/CourseSettings.svelte";
    import CourseSubmissions from "$lib/components/course/mentor/CourseSubmissions.svelte";
    import CourseWallet from "$lib/components/course/mentor/CourseWallet.svelte";
    import { api } from "$lib";
    import type { Course } from "$lib/api";
    import { formatMentoraDateTime } from "$lib/features/datetime/format";

    // Props
    const courseId = $derived(page.params.id);

    // State
    let activeTab = $state("dashboard"); // dashboard, topics, members, settings
    const courseState = api.createState<Course>();
    const fullCourse = $derived(courseState.value);
    const courseTitle = $derived(courseState.value?.title ?? "Loading...");

    interface Announcement {
        id: string;
        title: string;
        createdDate: string;
        [key: string]: unknown;
    }

    function parseAnnouncementContent(rawValue: unknown) {
        const normalized = String(rawValue ?? "")
            .replace(/\r\n/g, "\n")
            .trim();
        const titleMatch = normalized.match(/^\*\*(.*?)\*\*(?:\n|$)/);

        if (titleMatch?.[1]) {
            const title = titleMatch[1].trim();
            const body = normalized
                .slice(titleMatch[0].length)
                .replace(/^\n+/, "")
                .trim();

            return { title, body };
        }

        return {
            title:
                normalized.substring(0, 50) +
                (normalized.length > 50 ? "..." : ""),
            body: normalized,
        };
    }

    function formatDate(
        ts: number | Date | { toDate: () => Date } | null | undefined,
    ) {
        return formatMentoraDateTime(ts);
    }

    const announcements = $derived<Announcement[]>(
        (courseState.value?.announcements ?? []).map((a) => {
            const content =
                a.content ??
                (typeof a === "object" && a !== null && "title" in a
                    ? (a as { title: string }).title
                    : "");
            const parsed = parseAnnouncementContent(content);

            return {
                id: a.id,
                title: parsed.title,
                content: parsed.body,
                createdDate: formatDate(a.createdAt),
            };
        }),
    );

    $effect(() => {
        const id = courseId;
        if (!id) {
            courseState.cleanup();
            return;
        }

        let disposed = false;

        (async () => {
            if (!api.isAuthenticated) {
                await api.authReady;
            }
            if (disposed || courseId !== id) return;
            api.coursesSubscribe.get(id, courseState);
        })();

        return () => {
            disposed = true;
            courseState.cleanup();
        };
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
        const trimmedTitle = title.trim();
        const trimmedContent = content.trim();
        const safeTitle = trimmedTitle || "Untitled announcement";
        const formattedContent = trimmedContent
            ? `**${safeTitle}**\n${trimmedContent}`
            : `**${safeTitle}**`;

        if (id) {
            const now = Date.now();
            // Edit existing announcement
            const newAnnouncements = currentAnnouncements.map((a) =>
                a.id === id
                    ? { ...a, content: formattedContent, updatedAt: now }
                    : a,
            );

            await api.courses.update(courseId, {
                announcements: newAnnouncements,
            });
        } else {
            // Create new announcement via backend
            await api.courses.createAnnouncement(courseId, formattedContent);
        }
    }

    async function handleDeleteAnnouncement(id: string | number) {
        if (!courseId || !fullCourse) return;

        const currentAnnouncements = fullCourse.announcements || [];
        const newAnnouncements = currentAnnouncements.filter(
            (a) => String(a.id) !== String(id),
        );

        await api.courses.update(courseId, {
            announcements: newAnnouncements,
        });
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
    {:else if activeTab === "wallet" && courseId}
        <CourseWallet {courseId} />
    {:else if activeTab === "submissions" && courseId}
        <CourseSubmissions {courseId} />
    {/if}
</MentorCourseLayout>
