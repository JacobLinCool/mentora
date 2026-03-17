<script lang="ts">
    import { onMount } from "svelte";
    import { m } from "$lib/paraglide/messages";
    import { SvelteDate, SvelteMap } from "svelte/reactivity";
    import DashboardHeader from "$lib/components/dashboard/student/DashboardHeader.svelte";
    import UpcomingDeadline from "$lib/components/dashboard/student/UpcomingDeadline.svelte";
    import ContinueConversation from "$lib/components/dashboard/student/ContinueConversation.svelte";
    import MyCourses from "$lib/components/dashboard/student/MyCourses.svelte";
    import StudentAnnouncements from "$lib/components/dashboard/student/StudentAnnouncements.svelte";
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
    let lastConversationScore = $state<number | null>(null);

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
                                        itemType: "assignment" as const,
                                    })),
                                );
                            }
                            if (questRes.success) {
                                items.push(
                                    ...questRes.data.map((q) => ({
                                        ...q,
                                        course,
                                        itemType: "questionnaire" as const,
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

                const completedByItemId = new SvelteMap<string, boolean>();
                const chunkSize = 10;
                for (let i = 0; i < upcoming.length; i += chunkSize) {
                    const chunk = upcoming.slice(i, i + chunkSize);
                    const chunkResults = await Promise.all(
                        chunk.map(async (item) => {
                            const submissionRes = await api.submissions.getMine(
                                item.id,
                            );

                            if (!submissionRes.success || !submissionRes.data) {
                                return { id: item.id, completed: false };
                            }

                            const isCompleted =
                                submissionRes.data.state === "submitted" ||
                                submissionRes.data.state === "graded_complete";

                            return { id: item.id, completed: isCompleted };
                        }),
                    );

                    for (const result of chunkResults) {
                        completedByItemId.set(result.id, result.completed);
                    }
                }

                const pendingUpcoming = upcoming.filter(
                    (item) => !completedByItemId.get(item.id),
                );

                deadlines = pendingUpcoming.map((a) => ({
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

                // Sort again to ensure correct order
                deadlines.sort(
                    (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
                );

                deadlineDates = deadlines.map((d) => d.dueDate);
                if (deadlines.length > 0) {
                    selectedDeadline =
                        deadlines.find((d) => d.dueDate >= new Date()) ||
                        deadlines[0];
                }
            }

            // 3. Fetch Last Conversation & Title
            const convResult = await api.conversations.listMine({ limit: 10 });
            if (convResult.success && convResult.data.length > 0) {
                const activeConversation =
                    convResult.data.find(
                        (conversation) => conversation.state !== "closed",
                    ) ?? null;

                lastConversation = activeConversation;
                lastConversationTitle = "";
                lastConversationScore = null;

                if (!lastConversation) {
                    return;
                }

                if (lastConversation.assignmentId) {
                    const assignRes = await api.assignments.get(
                        lastConversation.assignmentId,
                    );
                    if (assignRes.success) {
                        lastConversationTitle = assignRes.data.title;
                    }

                    // Fetch assessment score if conversation is closed
                    if (lastConversation.state === "closed") {
                        try {
                            const subRes = await api.submissions.getMine(
                                lastConversation.assignmentId,
                            );
                            if (
                                subRes.success &&
                                subRes.data?.assessment?.overallScore
                            ) {
                                lastConversationScore =
                                    subRes.data.assessment.overallScore;
                            }
                        } catch {
                            // Silently ignore - score badge is optional
                        }
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
    <title>{m.dashboard_page_title()} - Mentora</title>
</svelte:head>

<div class="student-shell">
    <div class="student-container pt-6">
        <DashboardHeader
            userName={profile?.displayName || user?.displayName || m.unknown()}
        />

        <!-- Responsive grid layout for iPad -->
        <div class="md:grid md:grid-cols-2 md:gap-6">
            <!-- Left column: Deadline -->
            <div>
                {#if loading}
                    <div
                        class="student-panel flex h-64 animate-pulse items-center justify-center text-white/60"
                    >
                        {m.loading()}
                    </div>
                {:else}
                    <UpcomingDeadline
                        deadline={selectedDeadline}
                        {deadlineDates}
                        onDateSelect={handleDateSelect}
                    />
                {/if}
                <StudentAnnouncements />
            </div>

            <!-- Right column: Continue + Courses -->
            <div>
                {#if lastConversation}
                    <div class="relative">
                        {#if lastConversationScore}
                            <div
                                class="absolute -top-2 -right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#e8e8e8] text-sm font-bold text-[#2f2f2f]"
                            >
                                {lastConversationScore.toFixed(1)}
                            </div>
                        {/if}
                        <ContinueConversation
                            onclick={handleContinueConversation}
                            title={lastConversationTitle}
                        />
                    </div>
                {/if}

                <MyCourses {courses} />
            </div>
        </div>
    </div>

    <BottomNav activeTab="home" />
</div>
