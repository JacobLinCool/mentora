<script lang="ts">
    import { SvelteMap } from "svelte/reactivity";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { ArrowLeft } from "@lucide/svelte";
    import {
        api,
        type Topic,
        type Assignment,
        type Questionnaire,
        type SubmissionWithId,
    } from "$lib/api";
    import { Spinner } from "flowbite-svelte";
    import TopicCarousel from "$lib/components/course/TopicCarousel.svelte";
    import AssignmentTimeline from "$lib/components/course/AssignmentTimeline.svelte";
    import BottomNav from "$lib/components/layout/student/BottomNav.svelte";
    import PageHead from "$lib/components/PageHead.svelte";

    const courseId = $derived(page.params.id);

    // Unified Type for the UI
    interface CourseItem extends Assignment {
        type: "quiz" | "conversation" | "questionnaire";
        completed?: boolean;
        locked: boolean;
        orderInTopic?: number;
        submissionState?: "in_progress" | "submitted" | "graded_complete";
    }

    // State
    let loading = $state(true);
    let courseTitle = $state("");
    let topics = $state<Topic[]>([]);
    let currentTopicIndex = $state(0);
    // Store items grouped by topicId
    let groupedAssignments = $state<Record<string, CourseItem[]>>({});

    $effect(() => {
        let mounted = true;
        if (courseId && api.isAuthenticated) {
            loadData(mounted);
        } else if (courseId && !api.isAuthenticated) {
            // Wait for auth to be ready if trying to load
            api.authReady.then(() => {
                if (api.isAuthenticated && mounted) loadData(mounted);
            });
        }
        return () => {
            mounted = false;
        };
    });

    async function loadData(mounted: boolean) {
        if (!courseId) return;
        loading = true;
        try {
            const [courseRes, topicsRes, assignmentsRes, questionnairesRes] =
                await Promise.all([
                    api.courses.get(courseId),
                    api.topics.listForCourse(courseId),
                    api.assignments.listAvailable(courseId),
                    api.questionnaires.listAvailable(courseId),
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

            // Create Maps for O(1) Lookup
            const assignmentMap = new SvelteMap<string, Assignment>();
            if (assignmentsRes.success) {
                assignmentsRes.data.forEach((a) => assignmentMap.set(a.id, a));
            }

            const questionnaireMap = new SvelteMap<string, Questionnaire>();
            if (questionnairesRes.success) {
                questionnairesRes.data.forEach((q) =>
                    questionnaireMap.set(q.id, q),
                );
            }

            const groups: Record<string, CourseItem[]> = {};
            const submissionsMap = new SvelteMap<string, SubmissionWithId>();

            // 1. Resolve Submissions for Assignments AND Questionnaires (Parallel)

            // Collect all item IDs that allow submissions
            const allSubmissionIds: string[] = [];
            if (assignmentsRes.success)
                assignmentsRes.data.forEach((a) => allSubmissionIds.push(a.id));
            if (questionnairesRes.success)
                questionnairesRes.data.forEach((q) =>
                    allSubmissionIds.push(q.id),
                );

            if (allSubmissionIds.length > 0) {
                const chunk = 5;
                for (let i = 0; i < allSubmissionIds.length; i += chunk) {
                    if (!mounted) break;
                    const batch = allSubmissionIds.slice(i, i + chunk);
                    await Promise.all(
                        batch.map(async (id) => {
                            const subRes = await api.submissions.getMine(id);
                            if (subRes.success && subRes.data) {
                                submissionsMap.set(id, subRes.data);
                            }
                        }),
                    );
                }
            }

            if (!mounted) return;

            // 2. Build Timeline from Topic contents
            if (topicsRes.success) {
                topicsRes.data.forEach((topic) => {
                    groups[topic.id] = [];

                    const addItem = (id: string, itemType: string) => {
                        if (itemType === "questionnaire") {
                            const q = questionnaireMap.get(id);
                            if (!q) return;

                            const sub = submissionsMap.get(id);
                            const isCompleted =
                                !!sub &&
                                (sub.state === "submitted" ||
                                    sub.state === "graded_complete");

                            groups[topic.id].push({
                                ...q,
                                type: "questionnaire",
                                prompt: "", // Dummy to satisfy interface
                                mode: "instant",
                                submissionState: sub?.state,
                                completed: isCompleted, // Correctly setting completed based on submission
                                locked: q.startAt
                                    ? q.startAt > Date.now()
                                    : false,
                                orderInTopic: groups[topic.id].length,
                            });
                        } else {
                            // Assignment
                            const a = assignmentMap.get(id);
                            if (!a) return;

                            const sub = submissionsMap.get(id);
                            const isCompleted =
                                !!sub &&
                                (sub.state === "submitted" ||
                                    sub.state === "graded_complete");

                            // Determine type from itemType (topic data), fallback to 'conversation' only if unspecified or generic 'assignment'
                            let finalType =
                                itemType === "assignment"
                                    ? "conversation"
                                    : itemType;

                            groups[topic.id].push({
                                ...a,
                                type: finalType as CourseItem["type"],
                                completed: isCompleted,
                                submissionState: sub?.state,
                                locked: a.startAt
                                    ? a.startAt > Date.now()
                                    : false,
                                orderInTopic: groups[topic.id].length,
                            });
                        }
                    };

                    if (topic.contents && topic.contents.length > 0) {
                        topic.contents.forEach((id, idx) => {
                            const type =
                                topic.contentTypes?.[idx] || "assignment";
                            addItem(id, type);
                        });
                    } else {
                        // Legacy Fallback
                        if (assignmentsRes.success) {
                            assignmentsRes.data
                                .filter((a) => a.topicId === topic.id)
                                .forEach((a) => addItem(a.id, "assignment"));
                        }
                    }
                });
            }

            groupedAssignments = groups;

            // Smart default topic logic
            const now = Date.now();
            let defaultIndex = 0;
            for (let i = 0; i < topics.length; i++) {
                const topic = topics[i];
                const topicAssignments = groupedAssignments[topic.id] || [];
                const hasActive = topicAssignments.some(
                    (a) => !a.completed && (!a.dueAt || a.dueAt > now),
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
        (currentTopic ? (groupedAssignments[currentTopic.id] ?? []) : []).map(
            (a) => ({
                ...a,
                completed: a.completed ?? false,
            }),
        ),
    );

    function handleTopicChange(index: number) {
        currentTopicIndex = index;
    }

    async function handleAssignmentClick(assignment: Assignment) {
        const item = assignment as CourseItem;
        if (item.locked) return;

        if (item.type === "questionnaire") {
            goto(resolve(`/questionnaires/${item.id}`));
            return;
        }

        if (item.type === "conversation") {
            try {
                // Check if a conversation actually exists or can be created
                const convRes = await api.conversations.getForAssignment(
                    item.id,
                );
                if (convRes.success && convRes.data.id) {
                    goto(resolve(`/conversations/${convRes.data.id}`));
                    return;
                } else {
                    // Try to create only if we are sure it's meant to be a conversation
                    // For now, if getForAssignment fails, we MIGHT assume it's just an assignment (Essay)
                    // But if it's truly a new conversation assignment, we should create it.
                    // The issue: Essays are labeled 'conversation' by default.
                    // Heuristic: Try to create. If backend says "Not a conversation assignment" (if checks existed) it would fail.
                    // But backend create doesn't check type.

                    // NEW STRATEGY:
                    // Assume that if the type is ambiguous ('conversation'), we check the local storage or just rely on the user to correct the data.
                    // But since we can't fix data, we'll try to create.

                    // Actually, if it's an Essay, we want /assignments/[id].
                    // Let's assume ONLY "Quiz" and "Questionnaire" are strict.
                    // If it is 'conversation' (generic default), we check if the title contains "Essay" as a last resort hack,
                    // OR we just route to assignments if conversation creation fails.

                    const createRes = await api.conversations.create(item.id);
                    if (createRes.success && createRes.data.id) {
                        await api.submissions.start(item.id);
                        goto(resolve(`/conversations/${createRes.data.id}`));
                        return;
                    }

                    // If creation failed/returned null, fall through to assignment page
                }
            } catch (e) {
                console.warn(
                    "Routing as standard assignment due to conversation error",
                    e,
                );
            }
        }

        // Fallback for Essays or unknown types
        goto(resolve(`/assignments/${item.id}`));
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
                onAssignmentClick={handleAssignmentClick as unknown as (
                    item: object,
                ) => void}
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
