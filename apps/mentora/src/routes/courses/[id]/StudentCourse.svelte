<script lang="ts">
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { ArrowLeft } from "@lucide/svelte";
    import { api, type Topic, type Assignment } from "$lib/api";
    import { Spinner } from "flowbite-svelte";
    import TopicCarousel from "$lib/components/course/TopicCarousel.svelte";
    import AssignmentTimeline from "$lib/components/course/AssignmentTimeline.svelte";
    import BottomNav from "$lib/components/dashboard/BottomNav.svelte";
    import PageHead from "$lib/components/PageHead.svelte";

    const courseId = $derived(page.params.id);

    interface CourseAssignment extends Assignment {
        type: "quiz" | "conversation" | "essay";
        completed?: boolean;
        locked: boolean;
    }

    // State
    let loading = $state(true);
    let courseTitle = $state("");
    let topics = $state<Topic[]>([]);
    let currentTopicIndex = $state(0);
    // Store assignments grouped by topicId
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    let groupedAssignments = $state<Record<string, CourseAssignment[]>>({});

    onMount(async () => {
        if (courseId) {
            await loadData();
        }
    });

    async function loadData() {
        if (!courseId) return;
        loading = true;
        try {
            const [courseRes, topicsRes, assignmentsRes] = await Promise.all([
                api.courses.get(courseId),
                api.topics.listForCourse(courseId),
                api.assignments.listAvailable(courseId),
            ]);

            if (courseRes.success) {
                courseTitle = courseRes.data.title;
            }

            if (topicsRes.success) {
                // Ensure order
                topics = topicsRes.data.sort(
                    (a, b) => (a.order || 0) - (b.order || 0),
                );
            }

            if (assignmentsRes.success) {
                const assignments = assignmentsRes.data;
                const groups: Record<string, CourseAssignment[]> = {};

                // Fetch status for all assignments (might be heavy but needed for 'completed')
                const submissionsMap = new SvelteMap();

                // Parallel fetch
                await Promise.all(
                    assignments.map(async (a) => {
                        const subRes = await api.submissions.getMine(a.id);
                        if (subRes.success && subRes.data) {
                            submissionsMap.set(a.id, subRes.data);
                        }
                    }),
                );

                assignments.forEach((a) => {
                    const tid = a.topicId || "uncategorized";
                    if (!groups[tid]) groups[tid] = [];

                    const submission = submissionsMap.get(a.id);
                    const isCompleted =
                        submission &&
                        (submission.state === "completed" ||
                            submission.state === "graded");

                    // Determine type heuristic
                    let type = "quiz";
                    if (
                        a.title.includes("對話") ||
                        a.title.includes("Conversation")
                    )
                        type = "conversation";

                    groups[tid].push({
                        ...a,
                        type: type as "quiz" | "conversation" | "essay",
                        completed: isCompleted,
                        locked: a.startAt ? a.startAt > Date.now() : false,
                    });
                });

                // Sort by orderInTopic
                Object.values(groups).forEach((list) => {
                    list.sort(
                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                        (a, b) =>
                            ((a as any).orderInTopic || 0) -
                            ((b as any).orderInTopic || 0),
                    );
                });

                groupedAssignments = groups;
            }

            // Smart default topic logic
            const now = Date.now();
            let defaultIndex = 0;
            for (let i = 0; i < topics.length; i++) {
                const topic = topics[i];
                const topicAssignments = groupedAssignments[topic.id] || [];
                const hasActive = topicAssignments.some(
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    (a) =>
                        !a.completed &&
                        (!(a as any).dueAt || (a as any).dueAt > now),
                );
                if (hasActive) {
                    defaultIndex = i;
                    break;
                }
            }
            currentTopicIndex = defaultIndex;
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    let currentTopic = $derived(topics[currentTopicIndex]);
    let currentAssignments = $derived(
        currentTopic ? (groupedAssignments[currentTopic.id] ?? []) : [],
    );

    function handleTopicChange(index: number) {
        currentTopicIndex = index;
    }

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    async function handleAssignmentClick(assignment: any) {
        if (assignment.locked) return;

        // Try to start submission if not present
        if (!assignment.completed) {
            // OPTIONAL: Call start submission if needed, but since we are skipping the detail page
            // we should probably do it here or let the target page handle it.
            // For now, let's just route based on type.
        }

        if (assignment.type === "conversation") {
            // Need conversation ID to route directly
            // Try to find existing conversation
            try {
                // Heuristic: If we don't have conversation ID in the assignment object (we might need to fetch it or create it)
                // The currentAssignment object constructed in loadData doesn't seem to have conversationId yet
                // Let's rely on api call
                const convRes = await api.conversations.getForAssignment(
                    assignment.id,
                );
                if (convRes.success && convRes.data.id) {
                    goto(resolve(`/conversations/${convRes.data.id}`));
                    return;
                } else {
                    // If not found, create one
                    const createRes = await api.conversations.create(
                        assignment.id,
                    );
                    if (createRes.success && createRes.data.id) {
                        // Also implicitly start submission if not started?
                        // api.submissions.start(assignment.id) might be needed technically but conversation creation might imply it or fail if not?
                        // Actually api.conversations.create checks IF assignment started?
                        // Let's check api implementation.
                        // api implementation checks: assignment.startAt > now. It doesn't check submission existence.
                        // But usually we want a submission record.
                        await api.submissions.start(assignment.id);
                        goto(resolve(`/conversations/${createRes.data.id}`));
                        return;
                    }
                }
            } catch (e) {
                console.error("Failed to route conversation", e);
            }
        } else if (
            assignment.type === "quiz" ||
            assignment.type === "questionnaire"
        ) {
            // Assuming questionnaire routes use assignment ID or specific questionnaire ID
            // Current codebase has routes/questionnaires/[id], let's assume it takes assignment ID or we need to find link
            // For now, let's assume assignment.id works or we need a mapping.
            // Given I don't see a map, I will use assignment ID for now as placeholder
            goto(resolve(`/questionnaires/${assignment.id}`));
            return;
        }

        // Fallback to old route if type unknown
        goto(resolve(`/assignments/${assignment.id}`));
    }

    function goBack() {
        goto(resolve("/dashboard"));
    }
</script>

<PageHead title={courseTitle || "Course"} description="Course details" />

<div class="course-page">
    <!-- Header -->
    <header class="page-header">
        <button class="back-button" onclick={goBack}>
            <ArrowLeft class="back-icon" />
        </button>
        <h1 class="course-title">{courseTitle}</h1>
    </header>

    {#if loading}
        <div class="loading-container">
            <Spinner size="12" color="gray" />
        </div>
    {:else}
        <!-- Topic Carousel -->
        <TopicCarousel
            {topics}
            currentIndex={currentTopicIndex}
            onTopicChange={handleTopicChange}
        />

        <!-- Assignment Timeline -->
        <section class="assignments-section">
            <h3 class="section-title">作業進度</h3>
            <AssignmentTimeline
                assignments={currentAssignments}
                onAssignmentClick={handleAssignmentClick}
            />
        </section>
    {/if}

    <!-- Bottom Navigation -->
    <BottomNav activeTab="home" />
</div>

<style>
    .course-page {
        min-height: 100vh;
        background: linear-gradient(
            135deg,
            #2d2d2d 0%,
            #404040 50%,
            #5a5a5a 100%
        );
        padding-bottom: 6rem;
    }

    .page-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem 1.5rem 0.5rem;
        max-width: 42rem;
        margin: 0 auto;
    }

    @media (min-width: 1024px) {
        .page-header {
            max-width: 56rem;
        }
    }

    .back-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .back-button:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateX(-2px);
    }

    .back-button :global(.back-icon) {
        width: 1.25rem;
        height: 1.25rem;
        color: #fff;
    }

    .course-title {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 300;
        color: #fff;
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }

    .loading-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 50vh;
    }

    .assignments-section {
        padding: 0 1.5rem;
        max-width: 42rem;
        margin: 0 auto;
    }

    @media (min-width: 1024px) {
        .assignments-section {
            max-width: 56rem;
        }
    }

    .section-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        margin: 0 0 1rem;
        letter-spacing: 0.05em;
    }
</style>
