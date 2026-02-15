<script lang="ts">
    import {
        GripVertical,
        Pencil,
        Trash2,
        Save,
        Plus,
        X,
    } from "@lucide/svelte";
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
        topicIndex: number;
        title: string;
        description: string;
        assignments: Assignment[];
        isDragging?: boolean;
        onSave?: (title: string, description: string) => void;
        onDelete?: () => void;
        onAddAssignment?: () => void;
        onEditAssignment?: (assignment: Assignment) => void;
        onDeleteAssignment?: (assignmentId: string) => void;
        onAssignmentsReorder?: (assignments: Assignment[]) => void;
    }

    let {
        topicIndex,
        title: initialTitle,
        description: initialDescription,
        assignments = [],
        isDragging = false,
        onSave,
        onDelete,
        onAddAssignment,
        onEditAssignment,
        onDeleteAssignment,
        onAssignmentsReorder,
    }: Props = $props();

    // Each card manages its own edit state
    let isEditing = $state(false);
    let editTitle = $state("");
    let editDescription = $state("");
    let localAssignments = $state<Assignment[]>([]);
    let isError = $state(false);

    const flipDurationMs = 200;

    // Sync edit state with props
    $effect(() => {
        editTitle = initialTitle;
        editDescription = initialDescription;
        localAssignments = [...assignments];
    });

    function enterEditMode() {
        editTitle = initialTitle;
        editDescription = initialDescription;
        isEditing = true;
    }

    function handleSave() {
        if (!editTitle.trim()) {
            isError = true;
            return;
        }
        isError = false;
        onSave?.(editTitle, editDescription);
        isEditing = false;
    }

    function handleCancel() {
        editTitle = initialTitle;
        editDescription = initialDescription;
        localAssignments = [...assignments];
        isEditing = false;
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
                            placeholder={m.mentor_topic_input_title()}
                            class="w-full rounded-md border px-3 py-1.5 text-sm text-gray-900 focus:outline-none {isError
                                ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:ring-1 focus:ring-gray-400'}"
                            oninput={() => (isError = false)}
                        />
                        {#if isError}
                            <p class="mt-1 text-xs text-red-500">
                                {m.mentor_assignment_error_title_required()}
                            </p>
                        {/if}
                    </div>
                {:else}
                    <span class="font-semibold text-gray-900"
                        >{initialTitle}</span
                    >
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
                <p class="text-sm leading-relaxed text-gray-600">
                    {initialDescription}
                </p>
            {/if}
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-1">
            {#if isEditing}
                <button
                    type="button"
                    class="cursor-pointer p-1.5 text-gray-500 hover:text-green-600"
                    title={m.mentor_assignment_save()}
                    onclick={handleSave}
                    aria-label={m.mentor_assignment_save()}
                >
                    <Save size={18} />
                </button>
                <button
                    type="button"
                    class="cursor-pointer p-1.5 text-gray-500 hover:text-gray-700"
                    title={m.mentor_assignment_cancel()}
                    onclick={handleCancel}
                    aria-label={m.mentor_assignment_cancel()}
                >
                    <X size={18} />
                </button>
            {:else}
                <button
                    type="button"
                    class="cursor-pointer p-1.5 text-gray-500 hover:text-gray-700"
                    onclick={enterEditMode}
                    aria-label={m.edit()}
                >
                    <Pencil size={18} />
                </button>
            {/if}
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
                dragDisabled: !isEditing,
                type: "assignment",
                dropTargetStyle: {},
            }}
            onconsider={(e) => handleAssignmentDndConsider(e)}
            onfinalize={(e) => handleAssignmentDndFinalize(e)}
        >
            {#each localAssignments as assignment, idx (assignment.id)}
                <AssignmentItem
                    title={assignment.title}
                    type={assignment.type}
                    dueDate={assignment.dueAt ?? assignment.dueDate}
                    editMode={isEditing}
                    isDragging={assignment[SHADOW_ITEM_MARKER_PROPERTY_NAME] ??
                        false}
                    isLast={idx === localAssignments.length - 1}
                    onEdit={() => onEditAssignment?.(assignment)}
                    onDelete={() => onDeleteAssignment?.(assignment.id)}
                />
            {/each}
        </div>

        {#if isEditing}
            <div class="mt-2 ml-8 pl-4">
                <button
                    type="button"
                    class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                    onclick={onAddAssignment}
                >
                    <Plus size={16} />
                    {m.mentor_topic_add_assignment()}
                </button>
            </div>
        {/if}
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
