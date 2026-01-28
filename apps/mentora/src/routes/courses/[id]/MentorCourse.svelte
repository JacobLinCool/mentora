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
    let courseTitle = $state("Course01"); // Default or loading

    // Mock Announcements
    let announcements = $state([
        {
            id: 1,
            title: "Welcome to the course",
            createdDate: "2026.01.14 23:59",
        },
        {
            id: 2,
            title: "pretest",
            createdDate: "2026.01.14 23:59",
        },
        {
            id: 3,
            title: "pretest",
            createdDate: "2026.01.14 23:59",
        },
        {
            id: 4,
            title: "pretest",
            createdDate: "2026.01.14 23:59",
        },
    ]);

    async function loadCourseData() {
        if (courseId) {
            const courseResult = await api.courses.get(courseId);
            if (courseResult.success) {
                courseTitle = courseResult.data.title;
            }
        }
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
        <CourseDashboard {courseTitle} {announcements} />
    {:else if activeTab === "topics"}
        <CourseTopics {courseTitle} />
    {:else if activeTab === "members"}
        <CourseMembers {courseTitle} />
    {:else if activeTab === "settings"}
        <CourseSettings {courseTitle} />
    {/if}
</MentorCourseLayout>
