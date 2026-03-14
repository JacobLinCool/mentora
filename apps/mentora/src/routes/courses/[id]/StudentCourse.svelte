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
    import AssignmentTimeline, {
        type Assignment as TimelineAssignment,
    } from "$lib/components/course/AssignmentTimeline.svelte";
    import BottomNav from "$lib/components/layout/student/BottomNav.svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import { openAssignmentTarget } from "$lib/features/course/navigation";

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
        const cancelToken = { cancelled: false };

        if (courseId && api.isAuthenticated) {
            loadData(cancelToken);
        } else if (courseId && !api.isAuthenticated) {
            // Wait for auth to be ready if trying to load
            api.authReady.then(() => {
                if (api.isAuthenticated && !cancelToken.cancelled)
                    loadData(cancelToken);
            });
        }
        return () => {
            cancelToken.cancelled = true;
        };
    });

    async function loadData(cancelToken: { cancelled: boolean }) {
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

            if (cancelToken.cancelled) return;

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
                    if (cancelToken.cancelled) break;
                    const batch = allSubmissionIds.slice(i, i + chunk);

                    const results = await Promise.allSettled(
                        batch.map(async (id) => {
                            // Check before each fetch (optimization) matches race condition prevention?
                            // No, just fetch. We check token before setting.
                            const subRes = await api.submissions.getMine(id);
                            // We need to pass the result out
                            return { id, subRes };
                        }),
                    );

                    if (cancelToken.cancelled) break;

                    for (const result of results) {
                        if (result.status === "fulfilled") {
                            const { id, subRes } = result.value;
                            if (subRes.success && subRes.data) {
                                submissionsMap.set(id, subRes.data);
                            }
                        }
                    }
                }
            }

            if (cancelToken.cancelled) return;

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
                                question: null,
                                prompt: "", // Dummy to satisfy interface
                                mode: "instant",
                                classReport: null,
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

                            const finalType =
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

                    topic.contents.forEach((id, idx) => {
                        const type = topic.contentTypes?.[idx];
                        if (type !== "assignment" && type !== "questionnaire") {
                            return;
                        }
                        addItem(id, type);
                    });
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

    async function handleAssignmentClick(item: TimelineAssignment) {
        if (item.locked) return;
        const target = await openAssignmentTarget(api, {
            assignmentId: item.id,
            type: item.type,
        });
        if (target) {
            goto(resolve(target.route, target.params));
        }
    }

    function goBack() {
        goto(resolve("/dashboard"));
    }
</script>

<PageHead title={courseTitle || "Course"} description="Course details" />

<div
    class="min-h-screen bg-linear-to-br from-[#2d2d2d] via-[#404040] to-[#5a5a5a] pb-24"
>
    <!-- Header -->
    <header
        class="mx-auto flex max-w-[42rem] items-center gap-4 px-6 pt-6 pb-2 lg:max-w-4xl"
    >
        <button
            class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 transition-all duration-200 ease-in-out hover:-translate-x-[2px] hover:bg-white/15"
            onclick={goBack}
        >
            <ArrowLeft class="h-5 w-5 text-white" />
        </button>
        <h1
            class="m-0 text-[1.75rem] font-light tracking-[0.05em] text-white uppercase"
        >
            {courseTitle}
        </h1>
    </header>

    {#if loading}
        <div class="flex h-[50vh] items-center justify-center">
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
        <section class="mx-auto max-w-[42rem] px-6 lg:max-w-4xl">
            <h3
                class="mb-4 text-sm font-semibold tracking-[0.05em] text-white/60"
            >
                作業進度
            </h3>
            <AssignmentTimeline
                assignments={currentAssignments}
                onAssignmentClick={handleAssignmentClick}
            />
        </section>
    {/if}

    <!-- Bottom Navigation -->
    <BottomNav activeTab="home" />
</div>
