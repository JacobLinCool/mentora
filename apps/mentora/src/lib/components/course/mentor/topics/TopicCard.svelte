<script lang="ts">
    import { tick } from "svelte";
    import { GripVertical, Trash2, Plus } from "@lucide/svelte";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
    } from "svelte-dnd-action";
    import AssignmentItem from "./AssignmentItem.svelte";
    import * as m from "$lib/paraglide/messages";

    interface Assignment {
        id: string;
        title: string;
        type: "questionnaire" | "dialogue";
        dueDate?: string;
        dueAt?: string;
        [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean;
    }

    interface Props {
        courseId: string;
        topicIndex: number;
        title: string;
        description: string;
        assignments: Assignment[];
        isDragging?: boolean;
        onSave?: (title: string, description: string) => void;
        onDelete?: () => void;
        onAddAssignment?: () => void;
        onEditAssignment?: (assignment: Assignment) => void;
        onSaveAssignmentTitle?: (assignmentId: string, title: string) => void;
        onDeleteAssignment?: (assignmentId: string) => void;
        onAssignmentsReorder?: (assignments: Assignment[]) => void;
    }

    let {
        courseId,
        topicIndex,
        title: initialTitle,
        description: initialDescription,
        assignments = [],
        isDragging = false,
        onSave,
        onDelete,
        onAddAssignment,
        onEditAssignment,
        onSaveAssignmentTitle,
        onDeleteAssignment,
        onAssignmentsReorder,
    }: Props = $props();

    // Each card manages its own edit state
    let isEditing = $state(false);
    let editTitle = $state("");
    let editDescription = $state("");
    let localAssignments = $state<Assignment[]>([]);
    let cardRef = $state<HTMLDivElement | null>(null);
    let titleInput = $state<HTMLInputElement | null>(null);

    const flipDurationMs = 200;

    // Sync edit state with props
    $effect(() => {
        if (isEditing) {
            return;
        }

        editTitle = initialTitle;
        editDescription = initialDescription;
        localAssignments = [...assignments];
    });

    function enterEditMode() {
        editTitle = initialTitle;
        editDescription = initialDescription;
        isEditing = true;
        void tick().then(() => {
            titleInput?.focus();
            titleInput?.select();
        });
    }

    function commitTopicEdits() {
        const nextTitle = editTitle.trim() || initialTitle;
        const nextDescription = editDescription;
        if (
            nextTitle !== initialTitle ||
            nextDescription !== initialDescription
        ) {
            onSave?.(nextTitle, nextDescription);
        }
        isEditing = false;
    }

    function resetTopicEdits() {
        editTitle = initialTitle;
        editDescription = initialDescription;
        localAssignments = [...assignments];
        isEditing = false;
    }

    function handleCardPointerDown(event: PointerEvent) {
        if (!isEditing || !cardRef) return;
        const target = event.target;
        if (target instanceof Node && cardRef.contains(target)) {
            return;
        }
        commitTopicEdits();
    }

    $effect(() => {
        if (!isEditing) {
            return;
        }

        document.addEventListener("pointerdown", handleCardPointerDown, true);
        return () => {
            document.removeEventListener(
                "pointerdown",
                handleCardPointerDown,
                true,
            );
        };
    });

    function handleTopicTitleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            commitTopicEdits();
        } else if (event.key === "Escape") {
            event.preventDefault();
            resetTopicEdits();
        }
    }

    function handleAssignmentDndConsider(
        e: CustomEvent<{ items: Assignment[] }>,
    ) {
        localAssignments = e.detail.items;
    }

    function handleAssignmentDndFinalize(
        e: CustomEvent<{ items: Assignment[] }>,
    ) {
        localAssignments = e.detail.items;
        onAssignmentsReorder?.(localAssignments);
    }
</script>

<div
    bind:this={cardRef}
    class="topic-card mb-4 rounded-lg bg-white p-4 shadow-sm focus:ring-0 focus:outline-none"
    class:opacity-50={isDragging}
>
    <!-- Header -->
    <div class="mb-3 flex items-start gap-3">
        <!-- Drag handle for topic -->
        <div
            class="drag-handle mt-1 cursor-grab text-gray-400 hover:text-gray-600"
        >
            <GripVertical size={20} />
        </div>

        <div class="flex-1">
            <div class="mb-2 flex items-center gap-2">
                <span class="font-semibold text-gray-700"
                    >Topic {String(topicIndex).padStart(2, "0")}</span
                >
                {#if isEditing}
                    <div class="flex-1">
                        <input
                            type="text"
                            bind:value={editTitle}
                            bind:this={titleInput}
                            placeholder={m.mentor_topic_input_title()}
                            class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 focus:outline-none"
                            onkeydown={handleTopicTitleKeydown}
                        />
                    </div>
                {:else}
                    <button
                        type="button"
                        class="cursor-text border-none bg-transparent p-0 text-left font-semibold text-gray-900 transition-colors hover:text-gray-700"
                        onclick={enterEditMode}
                        aria-label={m.edit()}
                    >
                        {initialTitle}
                    </button>
                {/if}
            </div>

            {#if isEditing}
                <textarea
                    bind:value={editDescription}
                    placeholder={m.mentor_topic_input_description()}
                    rows={3}
                    class="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 focus:outline-none"
                ></textarea>
            {:else if initialDescription}
                <button
                    type="button"
                    class="cursor-text border-none bg-transparent p-0 text-left text-sm leading-relaxed text-gray-600 transition-colors hover:text-gray-800"
                    onclick={enterEditMode}
                    aria-label={m.edit()}
                >
                    {initialDescription}
                </button>
            {/if}
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-1">
            <button
                type="button"
                class="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                onclick={onAddAssignment}
            >
                <Plus size={16} />
                <span>{m.mentor_topic_add_assignment()}</span>
            </button>
            <button
                type="button"
                class="cursor-pointer p-1.5 text-gray-500 hover:text-red-500"
                onclick={onDelete}
                aria-label={m.delete()}
            >
                <Trash2 size={18} />
            </button>
        </div>
    </div>

    <!-- Assignments list with drag-and-drop -->
    {#if localAssignments.length > 0 || isEditing}
        <div
            class="assignments-list ml-8 border-l-2 border-gray-100 pl-4 outline-none"
            use:dndzone={{
                items: localAssignments,
                flipDurationMs,
                dragDisabled: false,
                type: "assignment",
                dropTargetStyle: {},
            }}
            onconsider={(e) => handleAssignmentDndConsider(e)}
            onfinalize={(e) => handleAssignmentDndFinalize(e)}
        >
            {#each localAssignments as assignment, idx (assignment.id)}
                <AssignmentItem
                    {courseId}
                    assignmentId={assignment.id}
                    title={assignment.title}
                    type={assignment.type}
                    dueDate={assignment.dueAt ?? assignment.dueDate}
                    editMode={isEditing}
                    isDragging={assignment[SHADOW_ITEM_MARKER_PROPERTY_NAME] ??
                        false}
                    isLast={idx === localAssignments.length - 1}
                    onOpenEditor={() => onEditAssignment?.(assignment)}
                    onSaveTitle={(title) =>
                        onSaveAssignmentTitle?.(assignment.id, title)}
                    onDelete={() => onDeleteAssignment?.(assignment.id)}
                />
            {/each}
        </div>
    {/if}
</div>

<style>
    .topic-card {
        border: 1px solid #e5e5e5;
    }

    .drag-handle:active {
        cursor: grabbing;
    }
</style>
