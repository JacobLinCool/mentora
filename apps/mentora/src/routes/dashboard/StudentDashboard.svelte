<script lang="ts">
    import { onMount } from "svelte";
    import { SvelteDate } from "svelte/reactivity";
    import DashboardHeader from "$lib/components/dashboard/student/DashboardHeader.svelte";
    import UpcomingDeadline from "$lib/components/dashboard/student/UpcomingDeadline.svelte";
    import ContinueConversation from "$lib/components/dashboard/student/ContinueConversation.svelte";
    import MyCourses from "$lib/components/dashboard/student/MyCourses.svelte";
    import BottomNav from "$lib/components/layout/student/BottomNav.svelte";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api, type Course, type Conversation } from "$lib/api";

    // Data State
    let courses = $state<Course[]>([]);
    // Define exact shape matching HEAD logic
    let deadlines = $state<
        {
            date: Date;
            title: string;
            id: string;
            course: string;
            courseId: string;
            assignment: string;
            assignmentId: string;
            dueDate: Date;
            type: string;
        }[]
    >([]);
    let selectedDeadline = $state<{
        date: Date;
        title: string;
        id: string;
        course: string;
        courseId: string;
        assignment: string;
        assignmentId: string;
        dueDate: Date;
        type: string;
    } | null>(null);
    let deadlineDates = $state<Date[]>([]);
    let lastConversation = $state<Conversation | null>(null);
    let lastConversationTitle = $state("");

    // Loading State
    let loading = $state(true);

    const user = $derived(api.currentUser);
    const profile = $derived(api.currentUserProfile);

    onMount(async () => {
        if (!api.isAuthenticated) {
            await api.authReady;
        }

        if (api.isAuthenticated) {
            await loadData();
        } else {
            goto(resolve("/auth"));
        }
    });

    async function loadData() {
        loading = true;
        try {
            // 1. Fetch Workspaces/Courses
            const coursesResult = await api.courses.listEnrolled();
            if (coursesResult.success) {
                courses = coursesResult.data;

                // 2. Fetch Assignments for deadlines
                // Optimization: Fetch in chunks to avoid thundering herd
                const allAssignments = [];
                const courseChunks = [];
                for (let i = 0; i < courses.length; i += 3) {
                    courseChunks.push(courses.slice(i, i + 3));
                }

                for (const chunk of courseChunks) {
                    const chunkRes = await Promise.all(
                        chunk.map(async (course) => {
                            const [assignRes, questRes] = await Promise.all([
                                api.assignments.listAvailable(course.id),
                                api.questionnaires.listAvailable(course.id),
                            ]);

                            // Combine types for the array
                            type DashboardItem = (
                                | (import("$lib/api").Assignment & {
                                      itemType: "assignment";
                                  })
                                | (import("$lib/api").Questionnaire & {
                                      itemType: "questionnaire";
                                  })
                            ) & { course: import("$lib/api").Course };

                            const items: DashboardItem[] = [];
                            if (assignRes.success) {
                                items.push(
                                    ...assignRes.data.map((a) => ({
                                        ...a,
                                        course,
                                        itemType: "assignment",
                                    })),
                                );
                            }
                            if (questRes.success) {
                                items.push(
                                    ...questRes.data.map((q) => ({
                                        ...q,
                                        course,
                                        itemType: "questionnaire",
                                    })),
                                );
                            }
                            return items;
                        }),
                    );
                    allAssignments.push(...chunkRes.flat());
                }

                // Filter items with due dates in the future
                const now = Date.now();
                const upcoming = allAssignments
                    .filter((a) => a.dueAt && a.dueAt > now)
                    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));

                deadlines = upcoming.map((a) => ({
                    id: a.id,
                    date: new Date(a.dueAt!),
                    title: a.title,
                    course: a.course.title,
                    courseId: a.course.id,
                    assignment: a.title,
                    assignmentId: a.id,
                    dueDate: new Date(a.dueAt!),
                    type: a.itemType ?? "assignment",
                }));

                deadlineDates = deadlines.map((d) => d.dueDate);
                if (deadlines.length > 0) {
                    selectedDeadline = deadlines[0];
                }
            }

            // 3. Fetch Last Conversation & Title
            const convResult = await api.conversations.listMine({ limit: 1 });
            if (convResult.success && convResult.data.length > 0) {
                lastConversation = convResult.data[0];
                if (lastConversation.assignmentId) {
                    const assignRes = await api.assignments.get(
                        lastConversation.assignmentId,
                    );
                    if (assignRes.success) {
                        lastConversationTitle = assignRes.data.title;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load dashboard data", e);
        } finally {
            loading = false;
        }
    }

    // Handle date selection from calendar
    function handleDateSelect(selectedDate: SvelteDate) {
        const deadline = deadlines.find((d) => {
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

    function handleContinueConversation() {
        if (lastConversation) {
            goto(resolve(`/conversations/${lastConversation.id}`));
        }
    }
</script>

<svelte:head>
    <title>Dashboard - Mentora</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#404040] to-[#858585] pb-24">
    <div class="mx-auto max-w-md px-6 pt-8 md:max-w-2xl lg:max-w-4xl">
        <DashboardHeader
            userName={profile?.displayName || user?.displayName || "User"}
        />

        <!-- Responsive grid layout for iPad -->
        <div class="md:grid md:grid-cols-2 md:gap-6">
            <!-- Left column: Deadline -->
            <div>
                {#if loading}
                    <div
                        class="flex h-64 animate-pulse items-center justify-center rounded-xl bg-white/5 text-white/50"
                    >
                        Loading...
                    </div>
                {:else}
                    <UpcomingDeadline
                        deadline={selectedDeadline}
                        {deadlineDates}
                        onDateSelect={handleDateSelect}
                    />
                {/if}
            </div>

            <!-- Right column: Continue + Courses -->
            <div>
                {#if lastConversation}
                    <ContinueConversation
                        onclick={handleContinueConversation}
                        title={lastConversationTitle}
                    />
                {/if}

                <MyCourses {courses} />
            </div>
        </div>
    </div>

    <BottomNav activeTab="home" />
</div>
