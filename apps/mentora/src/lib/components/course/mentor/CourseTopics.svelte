<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
    import {
        api,
        type Assignment as ApiAssignment,
        type Questionnaire as ApiQuestionnaire,
    } from "$lib/api";
    import { onMount, onDestroy } from "svelte";
    import TopicCard from "./topics/TopicCard.svelte";
    import AssignmentFormModal from "./topics/AssignmentFormModal.svelte";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
    } from "svelte-dnd-action";

    let { courseId }: { courseId: string } = $props();
    const flipDurationMs = 300;

    // Types matching backend + UI needs
    interface Assignment {
        id: string;
        title: string;
        type: "dialogue" | "questionnaire";
        dueAt?: string;
        startAt?: string;
        // ... other props
        topicId?: string;
    }

    interface Topic {
        id: string;
        title: string;
        description: string;
        assignments: Assignment[];
        order?: number;
    }

    // UI State
    let showAssignmentModal = $state(false);
    let assignmentModalMode = $state<"create" | "edit">("create");
    let currentTopicId = $state<string | null>(null);
    let currentAssignment = $state<Assignment | undefined>(undefined);
    let topics = $state<Topic[]>([]);

    let pollInterval: ReturnType<typeof setInterval>;

    onMount(() => {
        loadData();
        pollInterval = setInterval(loadData, 5000);
    });

    onDestroy(() => {
        if (pollInterval) clearInterval(pollInterval);
    });

    async function loadData() {
        if (!courseId) return;
        try {
            const [topicsRes, assignRes, questRes] = await Promise.all([
                api.topics.listCourseTopics(courseId),
                api.assignments.listCourseAssignments(courseId),
                api.questionnaires.listCourseQuestionnaires(courseId),
            ]);

            if (topicsRes.success) {
                const loadedTopics = topicsRes.data.sort(
                    (a, b) => (a.order || 0) - (b.order || 0),
                );

                // Map items to topics
                const assignmentsMap: Record<string, ApiAssignment> = {};
                if (assignRes.success) {
                    assignRes.data.forEach((a) => (assignmentsMap[a.id] = a));
                }
                const questionnairesMap: Record<string, ApiQuestionnaire> = {};
                if (questRes.success) {
                    questRes.data.forEach((q) => (questionnairesMap[q.id] = q));
                }

                topics = loadedTopics.map((t) => {
                    const items: Assignment[] = [];
                    // Use topic.contents (ID list) to maintain order
                    if (t.contents && t.contents.length > 0) {
                        t.contents.forEach((id, idx) => {
                            const type = t.contentTypes?.[idx] || "assignment";
                            let item;
                            let uiType: "dialogue" | "questionnaire" =
                                "dialogue";

                            if (type === "questionnaire") {
                                item = questionnairesMap[id];
                                uiType = "questionnaire";
                            } else {
                                item = assignmentsMap[id];
                                uiType = "dialogue";
                            }

                            if (item) {
                                items.push({
                                    id: item.id,
                                    title: item.title,
                                    type: uiType,
                                    dueAt: item.dueAt
                                        ? new Date(item.dueAt).toISOString()
                                        : undefined,
                                    startAt: item.startAt
                                        ? new Date(item.startAt).toISOString()
                                        : undefined,
                                    topicId: t.id,
                                });
                            }
                        });
                    }

                    // Fallback for items not in contents array but have topicId (legacy/robustness)
                    if (assignRes.success) {
                        assignRes.data.forEach((a) => {
                            if (
                                a.topicId === t.id &&
                                !items.find((i) => i.id === a.id)
                            ) {
                                items.push({
                                    id: a.id,
                                    title: a.title,
                                    type: "dialogue",
                                    dueAt: a.dueAt
                                        ? new Date(a.dueAt).toISOString()
                                        : undefined,
                                    topicId: t.id,
                                });
                            }
                        });
                    }
                    if (questRes.success) {
                        questRes.data.forEach((q) => {
                            if (
                                q.topicId === t.id &&
                                !items.find((i) => i.id === q.id)
                            ) {
                                items.push({
                                    id: q.id,
                                    title: q.title,
                                    type: "questionnaire",
                                    dueAt: q.dueAt
                                        ? new Date(q.dueAt).toISOString()
                                        : undefined,
                                    topicId: t.id,
                                });
                            }
                        });
                    }

                    return {
                        id: t.id,
                        title: t.title,
                        description: t.description || "",
                        assignments: items,
                        order: t.order || 0,
                    };
                });
            }
        } catch (e) {
            console.error("Failed to load topics", e);
        }
    }

    function handleTopicDndConsider(e: CustomEvent<{ items: Topic[] }>) {
        topics = e.detail.items;
    }

    async function handleTopicDndFinalize(e: CustomEvent<{ items: Topic[] }>) {
        topics = e.detail.items;
        // Save order
        // Doing sequential updates is slow, but simpler for now.
        // Ideally we'd have a batch update endpoint.
        for (let i = 0; i < topics.length; i++) {
            if (topics[i].order !== i) {
                await api.topics.update(topics[i].id, { order: i });
            }
        }
    }

    async function addTopic() {
        if (!courseId) return;
        const tempId = crypto.randomUUID();
        const newTopic = {
            id: tempId, // specific only for local optimistic update
            title: "New Topic",
            description: "",
            assignments: [],
            order: topics.length,
        };

        // Optimistic
        topics = [...topics, newTopic];

        const res = await api.topics.create({
            courseId,
            title: "New Topic",
            description: "",
            contents: [],
            contentTypes: [],
            order: topics.length,
        });

        if (res.success) {
            // Reload to get real ID
            loadData();
        }
    }

    async function updateTopic(
        topicId: string,
        title: string,
        description: string,
    ) {
        // Optimistic
        topics = topics.map((t) =>
            t.id === topicId ? { ...t, title, description } : t,
        );
        await api.topics.update(topicId, { title, description });
    }

    async function deleteTopic(topicId: string) {
        if (!confirm("Are you sure you want to delete this topic?")) return;

        // Optimistic
        topics = topics.filter((t) => t.id !== topicId);
        await api.topics.delete(topicId);
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

    async function handleSaveAssignment(
        assignmentData: Partial<Assignment> & { type: string },
    ) {
        // assignmentData comes from the form. Need to map to API payload.
        if (!currentTopicId || !courseId) return;

        const timestamp = Date.now();
        const dueAt = assignmentData.dueAt
            ? new Date(assignmentData.dueAt).getTime()
            : null;
        const startAt = assignmentData.startAt
            ? new Date(assignmentData.startAt).getTime()
            : timestamp;

        try {
            if (assignmentModalMode === "create") {
                let newItemId: string | null = null;
                const type =
                    assignmentData.type === "questionnaire"
                        ? "questionnaire"
                        : "assignment";

                if (type === "questionnaire") {
                    const res = await api.questionnaires.create({
                        courseId,
                        topicId: currentTopicId,
                        title: assignmentData.title,
                        questions: [], // Empty for now, as form might not provide questions structure yet
                        startAt: startAt,
                        dueAt: dueAt,
                        allowLate: true,
                        allowResubmit: true,
                    });
                    if (res.success) newItemId = res.data;
                } else {
                    const res = await api.assignments.create({
                        courseId,
                        topicId: currentTopicId,
                        title: assignmentData.title,
                        prompt: assignmentData.description || "",
                        mode: "instant",
                        startAt: startAt,
                        dueAt: dueAt,
                        allowLate: true,
                        allowResubmit: true,
                    });
                    if (res.success) newItemId = res.data;
                }

                if (newItemId) {
                    // Update Topic Contents
                    const topic = topics.find((t) => t.id === currentTopicId);
                    if (topic) {
                        // We need the raw topic data to know implicit contents...
                        // But we can just fetch the topic fresh to be safe
                        const topicRes = await api.topics.get(currentTopicId);
                        if (topicRes.success) {
                            const t = topicRes.data;
                            await api.topics.update(currentTopicId, {
                                contents: [...(t.contents || []), newItemId],
                                contentTypes: [...(t.contentTypes || []), type],
                            });
                        }
                    }
                }
            } else {
                // Edit
                if (currentAssignment) {
                    const type =
                        currentAssignment.type === "questionnaire"
                            ? "questionnaire"
                            : "assignment";
                    if (type === "questionnaire") {
                        await api.questionnaires.update(currentAssignment.id, {
                            title: assignmentData.title,
                            dueAt,
                            startAt,
                        });
                    } else {
                        await api.assignments.update(currentAssignment.id, {
                            title: assignmentData.title,
                            prompt: assignmentData.description,
                            dueAt,
                            startAt,
                        });
                    }
                }
            }
            showAssignmentModal = false;
            loadData();
        } catch (e) {
            console.error(e);
            alert("Error saving assignment");
        }
    }

    async function deleteAssignment(topicId: string, assignmentId: string) {
        if (!confirm("Are you sure you want to delete this assignment?"))
            return;

        // Locate assignment to know type
        // Simplified: try delete both? Or cleaner: look at UI Data
        const topic = topics.find((t) => t.id === topicId);
        const assignment = topic?.assignments.find(
            (a) => a.id === assignmentId,
        );

        if (!assignment) return;

        try {
            // 1. Remove from Topic contents
            const topicRes = await api.topics.get(topicId);
            if (topicRes.success) {
                const t = topicRes.data;
                const idx = (t.contents || []).indexOf(assignmentId);
                if (idx !== -1) {
                    const newContents = [...(t.contents || [])];
                    const newTypes = [...(t.contentTypes || [])];
                    newContents.splice(idx, 1);
                    newTypes.splice(idx, 1);
                    await api.topics.update(topicId, {
                        contents: newContents,
                        contentTypes: newTypes,
                    });
                }
            }

            // 2. Delete actual doc
            if (assignment.type === "questionnaire") {
                await api.questionnaires.delete(assignmentId);
            } else {
                await api.assignments.delete(assignmentId);
            }

            loadData();
        } catch (e) {
            console.error(e);
        }
    }

    function handleAssignmentsReorder(
        topicId: string,
        newAssignments: Assignment[],
    ) {
        // UI Update
        topics = topics.map((topic) => {
            if (topic.id !== topicId) return topic;
            return { ...topic, assignments: newAssignments };
        });

        // Sync to backend
        // Extract IDs and Types
        const contents = newAssignments.map((a) => a.id);
        const contentTypes = newAssignments.map((a) =>
            a.type === "questionnaire" ? "questionnaire" : "assignment",
        );

        api.topics.update(topicId, {
            contents,
            contentTypes,
        });
    }
</script>

<div class="topics-container">
    <!-- Header -->

    <!-- Topics list with drag-and-drop -->
    <div
        class="topics-list outline-none"
        use:dndzone={{
            items: topics,
            flipDurationMs,
            dragDisabled: false,
            type: "topic",
            dropTargetStyle: {},
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
