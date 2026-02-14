<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages";
    import {
        api,
        type Assignment as ApiAssignment,
        type Questionnaire as ApiQuestionnaire,
    } from "$lib/api";
    import { onMount } from "svelte";
    import TopicCard from "./topics/TopicCard.svelte";
    import AssignmentFormModal from "./topics/AssignmentFormModal.svelte";
    import PopupModal from "$lib/components/ui/PopupModal.svelte";
    import { Button } from "flowbite-svelte";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
    } from "svelte-dnd-action";
    import { startVisibilityPolling } from "$lib/features/polling/visibility";
    import {
        mapMentorQuestionsFromApi,
        mapMentorQuestionsToApi,
    } from "$lib/features/questionnaires/mapper";

    let { courseId }: { courseId: string } = $props();
    const flipDurationMs = 300;

    interface FormOption {
        id: string;
        text: string;
    }

    interface FormQuestion {
        id: string;
        type: "single" | "multiple" | "text";
        question: string;
        options: FormOption[];
    }

    interface Assignment {
        id: string;
        title: string;
        type: "dialogue" | "questionnaire";
        dueAt?: string;
        startAt?: string;
        topicId?: string;
        introduction?: string;
        prompt?: string;
        questions?: FormQuestion[];
    }

    interface Topic {
        id: string;
        title: string;
        description: string;
        assignments: Assignment[];
        order?: number;
    }

    let showAssignmentModal = $state(false);
    let assignmentModalMode = $state<"create" | "edit">("create");
    let currentTopicId = $state<string | null>(null);
    let currentAssignment = $state<Assignment | undefined>(undefined);
    let topics = $state<Topic[]>([]);

    let stopPolling: (() => void) | null = null;
    let errorMessage = $state<string | null>(null);
    let showDeleteModal = $state(false);
    let pendingDelete = $state<{
        type: "topic" | "assignment";
        topicId: string;
        assignmentId?: string;
    } | null>(null);

    onMount(() => {
        stopPolling = startVisibilityPolling(() => loadData(), {
            intervalMs: 5000,
            runImmediately: true,
            onError: (error) =>
                console.error("Failed to refresh topics", error),
        });

        return () => {
            stopPolling?.();
            stopPolling = null;
        };
    });

    function toIso(timestamp: number | null | undefined): string | undefined {
        return timestamp
            ? new Date(timestamp).toISOString().slice(0, 16)
            : undefined;
    }

    async function loadData() {
        if (!courseId) return;

        errorMessage = null;
        try {
            const [topicsRes, assignRes, questRes] = await Promise.all([
                api.topics.listForCourse(courseId),
                api.assignments.listForCourse(courseId),
                api.questionnaires.listForCourse(courseId),
            ]);

            if (!topicsRes.success || !assignRes.success || !questRes.success) {
                return;
            }

            const assignmentsMap: Record<string, ApiAssignment> = {};
            assignRes.data.forEach((assignment) => {
                assignmentsMap[assignment.id] = assignment;
            });

            const questionnairesMap: Record<string, ApiQuestionnaire> = {};
            questRes.data.forEach((questionnaire) => {
                questionnairesMap[questionnaire.id] = questionnaire;
            });

            topics = topicsRes.data
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((topic) => {
                    const items: Assignment[] = [];

                    if (topic.contents && topic.contentTypes) {
                        topic.contents.forEach((id, index) => {
                            const type = topic.contentTypes?.[index];
                            if (!type) {
                                return;
                            }

                            if (type === "questionnaire") {
                                const questionnaire = questionnairesMap[id];
                                if (!questionnaire) {
                                    return;
                                }

                                items.push({
                                    id: questionnaire.id,
                                    title: questionnaire.title,
                                    type: "questionnaire",
                                    dueAt: toIso(questionnaire.dueAt),
                                    startAt: toIso(questionnaire.startAt),
                                    topicId: topic.id,
                                    questions: mapMentorQuestionsFromApi(
                                        questionnaire.questions,
                                    ),
                                });
                                return;
                            }

                            const assignment = assignmentsMap[id];
                            if (!assignment) {
                                return;
                            }

                            items.push({
                                id: assignment.id,
                                title: assignment.title,
                                type: "dialogue",
                                dueAt: toIso(assignment.dueAt),
                                startAt: toIso(assignment.startAt),
                                topicId: topic.id,
                                introduction: assignment.question ?? "",
                                prompt: assignment.prompt,
                            });
                        });
                    }

                    return {
                        id: topic.id,
                        title: topic.title,
                        description: topic.description || "",
                        assignments: items,
                        order: topic.order || 0,
                    };
                });
        } catch (e) {
            console.error("Failed to load topics", e);
            errorMessage = m.mentor_topic_load_failed();
        }
    }

    function handleTopicDndConsider(e: CustomEvent<{ items: Topic[] }>) {
        topics = e.detail.items;
    }

    async function handleTopicDndFinalize(e: CustomEvent<{ items: Topic[] }>) {
        topics = e.detail.items;

        for (let index = 0; index < topics.length; index++) {
            if (topics[index].order === index) continue;
            await api.topics.update(topics[index].id, { order: index });
        }
    }

    async function addTopic() {
        if (!courseId) return;

        const res = await api.topics.create({
            courseId,
            title: "New Topic",
            description: "",
            contents: [],
            contentTypes: [],
            order: topics.length,
        });

        if (res.success) {
            await loadData();
        }
    }

    async function updateTopic(
        topicId: string,
        title: string,
        description: string,
    ) {
        topics = topics.map((topic) =>
            topic.id === topicId ? { ...topic, title, description } : topic,
        );
        await api.topics.update(topicId, { title, description });
    }

    function askDeleteTopic(topicId: string) {
        pendingDelete = { type: "topic", topicId };
        showDeleteModal = true;
    }

    function openAddAssignmentModal(topicId: string) {
        currentTopicId = topicId;
        currentAssignment = undefined;
        assignmentModalMode = "create";
        showAssignmentModal = true;
    }

    async function openEditAssignmentModal(
        topicId: string,
        assignment: Assignment,
    ) {
        currentTopicId = topicId;
        assignmentModalMode = "edit";

        if (assignment.type === "questionnaire") {
            const questionnaireResult = await api.questionnaires.get(
                assignment.id,
            );
            if (questionnaireResult.success) {
                currentAssignment = {
                    ...assignment,
                    title: questionnaireResult.data.title,
                    startAt: toIso(questionnaireResult.data.startAt),
                    dueAt: toIso(questionnaireResult.data.dueAt),
                    questions: mapMentorQuestionsFromApi(
                        questionnaireResult.data.questions,
                    ),
                };
            } else {
                currentAssignment = assignment;
            }
        } else {
            const assignmentResult = await api.assignments.get(assignment.id);
            if (assignmentResult.success) {
                currentAssignment = {
                    ...assignment,
                    title: assignmentResult.data.title,
                    introduction: assignmentResult.data.question ?? "",
                    prompt: assignmentResult.data.prompt,
                    startAt: toIso(assignmentResult.data.startAt),
                    dueAt: toIso(assignmentResult.data.dueAt),
                };
            } else {
                currentAssignment = assignment;
            }
        }

        showAssignmentModal = true;
    }

    async function handleSaveAssignment(
        assignmentData: Partial<Assignment> & { type: string },
    ) {
        if (!currentTopicId || !courseId) return;

        const now = Date.now();
        const dueAt = assignmentData.dueAt
            ? new Date(assignmentData.dueAt).getTime()
            : null;
        const startAt = assignmentData.startAt
            ? new Date(assignmentData.startAt).getTime()
            : now;

        try {
            if (assignmentModalMode === "create") {
                const type =
                    assignmentData.type === "questionnaire"
                        ? "questionnaire"
                        : "assignment";

                let newItemId: string | null = null;

                if (type === "questionnaire") {
                    const questions = mapMentorQuestionsToApi(
                        assignmentData.questions,
                    );
                    const createResult = await api.questionnaires.create({
                        courseId,
                        topicId: currentTopicId,
                        title: assignmentData.title || "New Questionnaire",
                        questions,
                        startAt,
                        dueAt,
                        allowLate: true,
                        allowResubmit: true,
                    });
                    if (createResult.success) newItemId = createResult.data;
                } else {
                    const createResult = await api.assignments.create({
                        courseId,
                        topicId: currentTopicId,
                        title: assignmentData.title || "New Assignment",
                        question: assignmentData.introduction?.trim() || null,
                        prompt: assignmentData.prompt?.trim() || "",
                        mode: "instant",
                        startAt,
                        dueAt,
                        allowLate: true,
                        allowResubmit: true,
                    });
                    if (createResult.success) newItemId = createResult.data;
                }

                if (newItemId) {
                    const topicResult = await api.topics.get(currentTopicId);
                    if (topicResult.success) {
                        const topic = topicResult.data;
                        await api.topics.update(currentTopicId, {
                            contents: [...(topic.contents || []), newItemId],
                            contentTypes: [...(topic.contentTypes || []), type],
                        });
                    }
                }
            } else if (currentAssignment) {
                if (currentAssignment.type === "questionnaire") {
                    await api.questionnaires.update(currentAssignment.id, {
                        title: assignmentData.title,
                        dueAt,
                        startAt,
                        questions: mapMentorQuestionsToApi(
                            assignmentData.questions,
                        ),
                    });
                } else {
                    await api.assignments.update(currentAssignment.id, {
                        title: assignmentData.title,
                        dueAt,
                        startAt,
                        question: assignmentData.introduction?.trim() || null,
                        prompt: assignmentData.prompt?.trim() || "",
                    });
                }
            }

            showAssignmentModal = false;
            await loadData();
        } catch (e) {
            console.error(e);
            errorMessage = m.mentor_assignment_save_failed();
        }
    }

    function askDeleteAssignment(topicId: string, assignmentId: string) {
        pendingDelete = { type: "assignment", topicId, assignmentId };
        showDeleteModal = true;
    }

    async function deleteAssignment(topicId: string, assignmentId: string) {
        const topic = topics.find((entry) => entry.id === topicId);
        const assignment = topic?.assignments.find(
            (entry) => entry.id === assignmentId,
        );
        if (!assignment) return;

        try {
            const topicResult = await api.topics.get(topicId);
            if (topicResult.success) {
                const topicDoc = topicResult.data;
                const assignmentIndex = (topicDoc.contents || []).indexOf(
                    assignmentId,
                );
                if (assignmentIndex !== -1) {
                    const newContents = [...(topicDoc.contents || [])];
                    const newTypes = [...(topicDoc.contentTypes || [])];
                    newContents.splice(assignmentIndex, 1);
                    newTypes.splice(assignmentIndex, 1);
                    await api.topics.update(topicId, {
                        contents: newContents,
                        contentTypes: newTypes,
                    });
                }
            }

            if (assignment.type === "questionnaire") {
                await api.questionnaires.delete(assignmentId);
            } else {
                await api.assignments.delete(assignmentId);
            }

            await loadData();
        } catch (e) {
            console.error(e);
            errorMessage = m.mentor_assignment_delete_failed();
        }
    }

    async function confirmDelete() {
        const target = pendingDelete;
        if (!target) return;

        try {
            if (target.type === "topic") {
                topics = topics.filter((topic) => topic.id !== target.topicId);
                await api.topics.delete(target.topicId);
                await loadData();
                pendingDelete = null;
                showDeleteModal = false;
                return;
            }

            await deleteAssignment(target.topicId, target.assignmentId || "");
            pendingDelete = null;
            showDeleteModal = false;
        } catch (e) {
            console.error(e);
            errorMessage = m.mentor_assignment_delete_failed();
        }
    }

    async function handleAssignmentsReorder(
        topicId: string,
        newAssignments: Assignment[],
    ) {
        topics = topics.map((topic) =>
            topic.id === topicId
                ? {
                      ...topic,
                      assignments: newAssignments,
                  }
                : topic,
        );

        const contents = newAssignments.map((assignment) => assignment.id);
        const contentTypes = newAssignments.map((assignment) =>
            assignment.type === "questionnaire"
                ? "questionnaire"
                : "assignment",
        );

        await api.topics.update(topicId, {
            contents,
            contentTypes,
        });
    }
</script>

<div class="topics-container">
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
                isDragging={((topic as unknown as Record<string, unknown>)[
                    SHADOW_ITEM_MARKER_PROPERTY_NAME
                ] as boolean) ?? false}
                onDelete={() => askDeleteTopic(topic.id)}
                onSave={(title, description) =>
                    updateTopic(topic.id, title, description)}
                onAddAssignment={() => openAddAssignmentModal(topic.id)}
                onEditAssignment={(assignment) =>
                    openEditAssignmentModal(topic.id, assignment)}
                onDeleteAssignment={(assignmentId) =>
                    askDeleteAssignment(topic.id, assignmentId)}
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

<AssignmentFormModal
    bind:open={showAssignmentModal}
    mode={assignmentModalMode}
    assignment={currentAssignment}
    onSave={handleSaveAssignment}
    onCancel={() => (showAssignmentModal = false)}
/>

<PopupModal bind:open={showDeleteModal} title={m.delete()}>
    <p class="text-sm text-gray-700">
        {pendingDelete?.type === "topic"
            ? m.mentor_topic_delete_confirm()
            : m.mentor_assignment_delete_confirm()}
    </p>

    {#snippet footer()}
        <div class="flex justify-end gap-2">
            <Button
                color="light"
                onclick={() => {
                    pendingDelete = null;
                    showDeleteModal = false;
                }}
            >
                {m.cancel()}
            </Button>
            <Button color="red" onclick={confirmDelete}>{m.delete()}</Button>
        </div>
    {/snippet}
</PopupModal>

{#if errorMessage}
    <p class="mt-4 text-sm text-red-500">{errorMessage}</p>
{/if}

<style>
    .topics-container {
        padding: 0;
    }
</style>
