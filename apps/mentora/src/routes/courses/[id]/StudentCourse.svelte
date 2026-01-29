<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { ArrowLeft } from "@lucide/svelte";
    import { api } from "$lib";
    import { Spinner } from "flowbite-svelte";
    import type { Topic } from "$lib/api";
    import TopicCarousel from "$lib/components/course/TopicCarousel.svelte";
    import AssignmentTimeline from "$lib/components/course/AssignmentTimeline.svelte";
    import BottomNav from "$lib/components/layout/student/BottomNav.svelte";

    import PageHead from "$lib/components/PageHead.svelte";

    const courseId = $derived(page.params.id);

    // State
    let loading = $state(true);
    let courseTitle = $state("");
    let topics = $state<Topic[]>([]);
    let currentTopicIndex = $state(0);

    // Mock data for demonstration
    const mockTopics = [
        {
            id: "topic-1",
            courseId: "course-01",
            title: "電車難題",
            description:
                "你要撞誰？這是一個經典的道德困境問題。探討在不同情境下，我們如何做出道德決策，以及這些決策背後的倫理原則。",
            order: 1,
            createdBy: "system",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            contents: [],
            contentTypes: [],
        },
        {
            id: "topic-2",
            courseId: "course-01",
            title: "功利主義",
            description:
                "功利主義是一種倫理理論，認為行為的對錯取決於其結果對整體幸福的影響。我們將探討這一理論的核心概念與批評。",
            order: 2,
            createdBy: "system",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            contents: [],
            contentTypes: [],
        },
        {
            id: "topic-3",
            courseId: "course-01",
            title: "義務論",
            description:
                "康德的義務論認為道德行為應基於義務和規則，而非結果。我們將深入了解這一倫理框架及其在現代社會的應用。",
            order: 3,
            createdBy: "system",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            contents: [],
            contentTypes: [],
        },
    ];
    // Mock assignments aligned with Assignment schema from API
    // Additional UI-only fields: type, completed, locked (not in API schema)
    const mockAssignments: Record<
        string,
        Array<{
            // API Assignment fields
            id: string;
            courseId: string | null;
            topicId: string | null;
            orderInTopic: number | null;
            title: string;
            prompt: string;
            mode: "instant";
            startAt: number;
            dueAt: number | null;
            allowLate: boolean;
            allowResubmit: boolean;
            createdBy: string;
            createdAt: number;
            updatedAt: number;
            // UI-only fields (derived from submission data in production)
            type: "quiz" | "conversation" | "essay";
            completed: boolean;
            locked: boolean;
        }>
    > = {
        "topic-1": [
            {
                id: "assign-1-1",
                courseId: "course-01",
                topicId: "topic-1",
                orderInTopic: 1,
                title: "前測",
                prompt: "完成這個測驗來評估您的先備知識。",
                mode: "instant",
                startAt: Date.now() - 86400000 * 7,
                dueAt: new Date(2026, 0, 20, 23, 59).getTime(),
                allowLate: true,
                allowResubmit: false,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 14,
                updatedAt: Date.now() - 86400000 * 14,
                type: "quiz",
                completed: true,
                locked: false,
            },
            {
                id: "assign-1-2",
                courseId: "course-01",
                topicId: "topic-1",
                orderInTopic: 2,
                title: "對話",
                prompt: "與 AI 進行對話討論。",
                mode: "instant",
                startAt: Date.now() - 86400000 * 7,
                dueAt: new Date(2026, 0, 20, 23, 59).getTime(),
                allowLate: true,
                allowResubmit: true,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 14,
                updatedAt: Date.now() - 86400000 * 14,
                type: "conversation",
                completed: true,
                locked: false,
            },
            {
                id: "assign-1-3",
                courseId: "course-01",
                topicId: "topic-1",
                orderInTopic: 3,
                title: "後測",
                prompt: "完成後測來評估您的學習成果。",
                mode: "instant",
                startAt: Date.now() - 86400000 * 7,
                dueAt: new Date(2026, 0, 20, 23, 59).getTime(),
                allowLate: true,
                allowResubmit: false,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 14,
                updatedAt: Date.now() - 86400000 * 14,
                type: "quiz",
                completed: false,
                locked: false,
            },
        ],
        "topic-2": [
            {
                id: "assign-2-1",
                courseId: "course-01",
                topicId: "topic-2",
                orderInTopic: 1,
                title: "前測",
                prompt: "完成功利主義主題的先備知識測驗。",
                mode: "instant",
                startAt: Date.now() - 86400000 * 3,
                dueAt: new Date(2026, 0, 25, 23, 59).getTime(),
                allowLate: true,
                allowResubmit: false,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 10,
                type: "quiz",
                completed: false,
                locked: false,
            },
            {
                id: "assign-2-2",
                courseId: "course-01",
                topicId: "topic-2",
                orderInTopic: 2,
                title: "對話",
                prompt: "探討功利主義的核心概念。",
                mode: "instant",
                startAt: Date.now() - 86400000 * 3,
                dueAt: new Date(2026, 0, 25, 23, 59).getTime(),
                allowLate: true,
                allowResubmit: true,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 10,
                type: "conversation",
                completed: false,
                locked: true,
            },
            {
                id: "assign-2-3",
                courseId: "course-01",
                topicId: "topic-2",
                orderInTopic: 3,
                title: "後測",
                prompt: "評估功利主義的學習成果。",
                mode: "instant",
                startAt: Date.now() - 86400000 * 3,
                dueAt: new Date(2026, 0, 25, 23, 59).getTime(),
                allowLate: true,
                allowResubmit: false,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 10,
                type: "quiz",
                completed: false,
                locked: true,
            },
        ],
        "topic-3": [
            {
                id: "assign-3-1",
                courseId: "course-01",
                topicId: "topic-3",
                orderInTopic: 1,
                title: "前測",
                prompt: "義務論主題的先備知識測驗。",
                mode: "instant",
                startAt: new Date(2026, 0, 26).getTime(),
                dueAt: new Date(2026, 1, 1, 23, 59).getTime(),
                allowLate: false,
                allowResubmit: false,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 10,
                type: "quiz",
                completed: false,
                locked: true,
            },
            {
                id: "assign-3-2",
                courseId: "course-01",
                topicId: "topic-3",
                orderInTopic: 2,
                title: "對話",
                prompt: "探討康德義務論的核心概念。",
                mode: "instant",
                startAt: new Date(2026, 0, 26).getTime(),
                dueAt: new Date(2026, 1, 1, 23, 59).getTime(),
                allowLate: true,
                allowResubmit: true,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 10,
                type: "conversation",
                completed: false,
                locked: true,
            },
            {
                id: "assign-3-3",
                courseId: "course-01",
                topicId: "topic-3",
                orderInTopic: 3,
                title: "後測",
                prompt: "義務論學習成果評估。",
                mode: "instant",
                startAt: new Date(2026, 0, 26).getTime(),
                dueAt: new Date(2026, 1, 1, 23, 59).getTime(),
                allowLate: false,
                allowResubmit: false,
                createdBy: "mock-instructor",
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 10,
                type: "quiz",
                completed: false,
                locked: true,
            },
        ],
    };

    // Derived state
    let currentTopic = $derived(topics[currentTopicIndex]);
    let currentAssignments = $derived(
        currentTopic ? (mockAssignments[currentTopic.id] ?? []) : [],
    );

    async function loadCourseData() {
        loading = true;

        // Try to load real data first
        if (courseId) {
            const courseResult = await api.courses.get(courseId);
            if (courseResult.success) {
                courseTitle = courseResult.data.title;
            } else {
                courseTitle = "COURSE01";
            }

            // Load topics
            const topicsResult = await api.topics.listForCourse(courseId);
            if (topicsResult.success && topicsResult.data.length > 0) {
                // Sanitize order to ensure it's a number
                topics = topicsResult.data.map((t) => ({
                    ...t,
                    order: t.order ?? 0,
                })) as Topic[];
            } else {
                // Use mock topics
                topics = mockTopics;
            }
        } else {
            // No course ID, use mocks
            courseTitle = "COURSE01";
            topics = mockTopics;
        }

        // Determine smart default topic
        // Logic: Find first topic where there is at least one assignment that is
        // NOT completed AND NOT expired (if due date exists)
        // Since we are using mockAssignments dictionary for the structure in this demo:
        let defaultIndex = 0;
        const now = Date.now();

        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            const topicAssignments = mockAssignments[topic.id] || [];

            // Check if this topic has any "active" assignment
            const hasActiveAssignment = topicAssignments.some((a) => {
                // Not completed
                if (a.completed) return false;
                // Not expired (if due date is set)
                // If dueAt is null, it never expires
                if (a.dueAt && a.dueAt < now) return false;

                return true;
            });

            if (hasActiveAssignment) {
                defaultIndex = i;
                break;
            }
        }

        currentTopicIndex = defaultIndex;

        loading = false;
    }

    function handleTopicChange(index: number) {
        currentTopicIndex = index;
    }

    function handleAssignmentClick(assignment: {
        id: string;
        locked: boolean;
    }) {
        if (!assignment.locked) {
            goto(resolve(`/assignments/${assignment.id}`));
        }
    }

    function goBack() {
        goto(resolve("/dashboard"));
    }

    onMount(() => {
        loadCourseData();
    });
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
