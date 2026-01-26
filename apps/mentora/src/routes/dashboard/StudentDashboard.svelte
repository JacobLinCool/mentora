<script lang="ts">
    import { SvelteDate } from "svelte/reactivity";
    import DashboardHeader from "$lib/components/dashboard/student/DashboardHeader.svelte";
    import UpcomingDeadline from "$lib/components/dashboard/student/UpcomingDeadline.svelte";
    import ContinueConversation from "$lib/components/dashboard/student/ContinueConversation.svelte";
    import MyCourses from "$lib/components/dashboard/student/MyCourses.svelte";
    import BottomNav from "$lib/components/dashboard/student/BottomNav.svelte";

    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";

    // Mock deadline data with multiple deadlines
    const allDeadlines = [
        {
            date: new Date(2026, 0, 13),
            course: "course 02",
            assignment: "assignment02",
            dueDate: new Date(2026, 0, 13, 23, 59, 59),
        },
        {
            date: new Date(2026, 0, 15),
            course: "course 01",
            assignment: "assignment01",
            dueDate: new Date(2026, 0, 15, 23, 59, 59),
        },
        {
            date: new Date(2026, 0, 18),
            course: "course 03",
            assignment: "assignment03",
            dueDate: new Date(2026, 0, 18, 23, 59, 59),
        },
        {
            date: new Date(2026, 0, 22),
            course: "course 04",
            assignment: "assignment04",
            dueDate: new Date(2026, 0, 22, 23, 59, 59),
        },
    ];

    // Current selected deadline (default to first one)
    let selectedDeadline = $state(allDeadlines[0]);

    // Mock deadline dates (for yellow indicator dots)
    const deadlineDates = allDeadlines.map((d) => d.dueDate);

    // Handle date selection from calendar
    function handleDateSelect(selectedDate: SvelteDate) {
        // Find deadline for the selected date
        const deadline = allDeadlines.find((d) => {
            return (
                d.dueDate.getDate() === selectedDate.getDate() &&
                d.dueDate.getMonth() === selectedDate.getMonth() &&
                d.dueDate.getFullYear() === selectedDate.getFullYear()
            );
        });

        if (deadline) {
            selectedDeadline = deadline;
        }
    }

    // Mock course data aligned with CourseDoc schema
    const courses = [
        {
            id: "course-1",
            title: "course01",
            code: "COURSE01",
            ownerId: "mock-owner-1",
            visibility: "private",
            theme: null,
            description: null,
            thumbnail: { storagePath: "", url: "/course-placeholder.jpg" },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        },
        {
            id: "course-2",
            title: "course02",
            code: "COURSE02",
            ownerId: "mock-owner-1",
            visibility: "private",
            theme: null,
            description: null,
            thumbnail: { storagePath: "", url: "/course-placeholder.jpg" },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        },
        {
            id: "course-3",
            title: "course03",
            code: "COURSE03",
            ownerId: "mock-owner-1",
            visibility: "private",
            theme: null,
            description: null,
            thumbnail: { storagePath: "", url: "/course-placeholder.jpg" },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        },
    ];

    // Mock data for unfinished conversation
    const unfinishedConversation = {
        id: "conv-123",
        title: "繼續討論電車難題",
    };

    function handleContinueConversation() {
        goto(resolve(`/conversations/${unfinishedConversation.id}`));
    }
</script>

<svelte:head>
    <title>Dashboard - Mentora</title>
</svelte:head>

<div class="min-h-screen pb-24">
    <div class="mx-auto max-w-md px-6 pt-8 md:max-w-2xl lg:max-w-4xl">
        <DashboardHeader userName="user01" />

        <!-- Responsive grid layout for iPad -->
        <div class="md:grid md:grid-cols-2 md:gap-6">
            <!-- Left column: Deadline -->
            <div>
                <UpcomingDeadline
                    deadline={selectedDeadline}
                    {deadlineDates}
                    onDateSelect={handleDateSelect}
                />
            </div>

            <!-- Right column: Continue + Courses -->
            <div>
                <ContinueConversation onclick={handleContinueConversation} />

                <MyCourses {courses} />
            </div>
        </div>
    </div>

    <BottomNav activeTab="home" />
</div>
