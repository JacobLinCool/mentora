<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
    } from "svelte-dnd-action";
    import TopicCard from "./topics/TopicCard.svelte";
    import AssignmentFormModal from "./topics/AssignmentFormModal.svelte";
    import * as m from "$lib/paraglide/messages.js";

    // Types
    type AssignmentType = "dialogue" | "questionnaire";
    type QuestionType = "single" | "multiple" | "text";

    interface Option {
        id: string;
        text: string;
    }

    interface Question {
        id: string;
        type: QuestionType;
        question: string;
        options: Option[];
    }

    interface FileItem {
        name: string;
        uploadedAt: string;
    }

    interface Assignment {
        id: string;
        title: string;
        type: AssignmentType;
        dueDate?: string;
        prompt?: string;
        files?: FileItem[];
        questions?: Question[];
        startAt?: string;
        dueAt?: string;
    }

    interface Topic {
        id: string;
        title: string;
        description: string;
        assignments: Assignment[];
        [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean;
    }

    // UI State
    let showAssignmentModal = $state(false);
    let assignmentModalMode = $state<"create" | "edit">("create");
    let currentTopicId = $state<string | null>(null);
    let currentAssignment = $state<Assignment | undefined>(undefined);

    // Mock data for topics
    let topics = $state<Topic[]>([
        {
            id: "1",
            title: "蘇格拉底的方法",
            description:
                "蘇格拉底式的提問是一種批判性討論的方法，通過嚴格的質疑來啟發思想、揭示潛在的前提，並揭露矛盾。此主題將介紹如何通過對話促進深入的思考和反思。",
            assignments: [
                {
                    id: "a1",
                    title: "電車問題討論",
                    type: "dialogue",
                    dueAt: "2026-12-31T23:59",
                },
                {
                    id: "a2",
                    title: "課前測驗",
                    type: "questionnaire",
                    dueAt: "2026-12-28T12:00",
                },
            ],
        },
        {
            id: "2",
            title: "道德哲學基礎",
            description:
                "探討道德哲學的基本概念，包括義務論、後果論和德性倫理學的核心思想。",
            assignments: [
                {
                    id: "a3",
                    title: "道德困境分析",
                    type: "dialogue",
                    dueAt: "2027-01-15T18:00",
                },
            ],
        },
    ]);

    const flipDurationMs = 200;

    function handleTopicDndConsider(e: CustomEvent<{ items: Topic[] }>) {
        topics = e.detail.items;
    }

    function handleTopicDndFinalize(e: CustomEvent<{ items: Topic[] }>) {
        topics = e.detail.items;
    }

    function addTopic() {
        const newTopic: Topic = {
            id: crypto.randomUUID(),
            title: "",
            description: "",
            assignments: [],
        };
        topics = [...topics, newTopic];
    }

    function updateTopic(topicId: string, title: string, description: string) {
        topics = topics.map((t) =>
            t.id === topicId ? { ...t, title, description } : t,
        );
    }

    function deleteTopic(topicId: string) {
        topics = topics.filter((t) => t.id !== topicId);
    }

    function openAddAssignmentModal(topicId: string) {
        currentTopicId = topicId;
        currentAssignment = undefined;
        assignmentModalMode = "create";
        showAssignmentModal = true;
    }

    function openEditAssignmentModal(topicId: string, assignment: Assignment) {
        currentTopicId = topicId;
        currentAssignment = assignment;
        assignmentModalMode = "edit";
        showAssignmentModal = true;
    }

    function handleSaveAssignment(assignmentData: Assignment) {
        if (!currentTopicId) return;

        topics = topics.map((topic) => {
            if (topic.id !== currentTopicId) return topic;

            if (assignmentModalMode === "create") {
                return {
                    ...topic,
                    assignments: [
                        ...topic.assignments,
                        {
                            ...assignmentData,
                            id: assignmentData.id || crypto.randomUUID(),
                        },
                    ],
                };
            } else {
                return {
                    ...topic,
                    assignments: topic.assignments.map((a) =>
                        a.id === assignmentData.id
                            ? { ...a, ...assignmentData }
                            : a,
                    ),
                };
            }
        });

        showAssignmentModal = false;
    }

    function deleteAssignment(topicId: string, assignmentId: string) {
        topics = topics.map((topic) => {
            if (topic.id !== topicId) return topic;
            return {
                ...topic,
                assignments: topic.assignments.filter(
                    (a) => a.id !== assignmentId,
                ),
            };
        });
    }

    function handleAssignmentsReorder(
        topicId: string,
        newAssignments: Assignment[],
    ) {
        topics = topics.map((topic) => {
            if (topic.id !== topicId) return topic;
            return { ...topic, assignments: newAssignments };
        });
    }
</script>

<div class="topics-container">
    <!-- Header -->

    <!-- Topics list with drag-and-drop -->
    <div
        class="topics-list"
        use:dndzone={{
            items: topics,
            flipDurationMs,
            dragDisabled: false,
            type: "topic",
        }}
        onconsider={(e) => handleTopicDndConsider(e)}
        onfinalize={(e) => handleTopicDndFinalize(e)}
    >
        {#each topics as topic, idx (topic.id)}
            <TopicCard
                topicIndex={idx + 1}
                title={topic.title}
                description={topic.description}
                assignments={topic.assignments}
                isDragging={topic[SHADOW_ITEM_MARKER_PROPERTY_NAME] ?? false}
                onDelete={() => deleteTopic(topic.id)}
                onSave={(title, description) =>
                    updateTopic(topic.id, title, description)}
                onAddAssignment={() => openAddAssignmentModal(topic.id)}
                onEditAssignment={(assignment) =>
                    openEditAssignmentModal(topic.id, assignment)}
                onDeleteAssignment={(assignmentId) =>
                    deleteAssignment(topic.id, assignmentId)}
                onAssignmentsReorder={(newAssignments) =>
                    handleAssignmentsReorder(topic.id, newAssignments)}
            />
        {/each}
    </div>

    <div class="mt-6 flex justify-center">
        <button
            type="button"
            class="flex cursor-pointer items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200"
            onclick={addTopic}
        >
            <Plus size={16} />
            {m.mentor_topic_add()}
        </button>
    </div>
</div>

<!-- Assignment Form Modal -->
<AssignmentFormModal
    bind:open={showAssignmentModal}
    mode={assignmentModalMode}
    assignment={currentAssignment}
    onSave={handleSaveAssignment}
    onCancel={() => (showAssignmentModal = false)}
/>

<style>
    .topics-container {
        padding: 0;
    }
</style>
