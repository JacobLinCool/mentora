<script lang="ts">
    import { page } from "$app/state";
    import MentorCourseLayout from "$lib/components/course/mentor/MentorCourseLayout.svelte";
    import CourseDashboard from "$lib/components/course/mentor/CourseDashboard.svelte";
    import CourseTopics from "$lib/components/course/mentor/CourseTopics.svelte";
    import CourseMembers from "$lib/components/course/mentor/CourseMembers.svelte";
    import CourseSettings from "$lib/components/course/mentor/CourseSettings.svelte";
    import { onMount } from "svelte";
    import { api } from "$lib";

    // Props
    const courseId = $derived(page.params.id);

    // State
    let activeTab = $state("dashboard"); // dashboard, topics, members, settings
    let courseTitle = $state("Loading...");

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
                courseTitle = courseResult.data.title;
                // Map API announcements to UI format (assuming UI expects {id, title, createdDate})
                // API announcements have {id, content, createdAt}
                announcements = (courseResult.data.announcements || []).map(
                    (a) => ({
                        id: a.id,
                        title:
                            a.content.substring(0, 50) +
                            (a.content.length > 50 ? "..." : ""), // Use content as title
                        createdDate: formatDate(a.createdAt),
                    }),
                );
            }
        }
    }

    function formatDate(
        ts: number | Date | { toDate: () => Date } | null | undefined,
    ) {
        if (!ts) return "-";
        const d =
            typeof ts === "number"
                ? new Date(ts)
                : !(ts instanceof Date) && "toDate" in ts
                  ? ts.toDate()
                  : new Date(ts as Date | number | string);
        return (
            d.toLocaleDateString() +
            " " +
            d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
    }

    onMount(() => {
        loadCourseData();
    });

    function handleTabChange(tab: string) {
        activeTab = tab;
    }
</script>

<MentorCourseLayout {activeTab} onTabChange={handleTabChange} {courseTitle}>
    {#if activeTab === "dashboard"}
        <CourseDashboard {announcements} />
    {:else if activeTab === "topics"}
        <CourseTopics />
    {:else if activeTab === "members"}
        <CourseMembers />
    {:else if activeTab === "settings"}
        <CourseSettings />
    {/if}
</MentorCourseLayout>
