<script>
    import DashboardHeader from "$lib/components/dashboard/DashboardHeader.svelte";
    import UpcomingDeadline from "$lib/components/dashboard/UpcomingDeadline.svelte";
    import ContinueConversation from "$lib/components/dashboard/ContinueConversation.svelte";
    import MyCourses from "$lib/components/dashboard/MyCourses.svelte";
    import BottomNav from "$lib/components/dashboard/BottomNav.svelte";

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
    function handleDateSelect(selectedDate) {
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

    // Mock course data
    const courses = [
        {
            id: "course-1",
            name: "course01",
            imageUrl: "/course-placeholder.jpg",
        },
        {
            id: "course-2",
            name: "course01",
            imageUrl: "/course-placeholder.jpg",
        },
        {
            id: "course-3",
            name: "course01",
            imageUrl: "/course-placeholder.jpg",
        },
    ];

    // Mock data for unfinished conversation
    const unfinishedConversation = {
        id: "conv-123",
        title: "繼續討論電車難題",
    };

    function handleContinueConversation() {
        window.location.href = `/conversations/${unfinishedConversation.id}`;
    }
</script>

<svelte:head>
    <title>Dashboard - Mentora</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#404040] to-[#858585] pb-24">
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
                <ContinueConversation
                    conversationId={unfinishedConversation.id}
                    onclick={handleContinueConversation}
                />

                <MyCourses {courses} />
            </div>
        </div>
    </div>

    <BottomNav activeTab="home" />
</div>
