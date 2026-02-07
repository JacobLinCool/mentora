<script lang="ts">
    import {
        GripVertical,
        CircleCheck,
        CheckSquare,
        AlignLeft,
        Pencil,
        Trash2,
        Save,
        Plus,
    } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
    } from "svelte-dnd-action";
    import { untrack } from "svelte";

    type QuestionType = "single" | "multiple" | "text";

    interface Option {
        id: string;
        text: string;
        [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean;
    }

    interface Props {
        type: QuestionType;
        question: string;
        options: Option[];
        editMode?: boolean; // Context prop: can this item be edited?
        initialEditMode?: boolean; // Controls if item starts in edit mode (for new questions)
        isDragging?: boolean;
        onDelete?: () => void;
        onSave?: (data: {
            type: QuestionType;
            question: string;
            options: Option[];
            initialEditMode?: boolean;
        }) => void;
    }

    let {
        type: initialType,
        question: initialQuestion,
        options: initialOptions,
        editMode: contextEditMode = false,
        initialEditMode = false,
        isDragging = false,
        onDelete,
        onSave,
    }: Props = $props();

    // Local Edit state
    // We start in edit mode ONLY if explicitly requested AND we are not dragging.
    // This prevents drag operations (which may recreate components) from triggering edit mode.
    // Use untrack to prevent Svelte warning about prop usage in $state initialization.
    let isEditing = $state(untrack(() => initialEditMode && !isDragging));

    let currentType = $state<QuestionType>(untrack(() => initialType));
    let currentQuestion = $state(untrack(() => initialQuestion));
    let currentOptions = $state<Option[]>(untrack(() => [...initialOptions]));

    const flipDurationMs = 200;

    const typeOptions: { value: QuestionType; label: string }[] = [
        { value: "single", label: m.mentor_assignment_question_type_single() },
        {
            value: "multiple",
            label: m.mentor_assignment_question_type_multiple(),
        },
        { value: "text", label: m.mentor_assignment_question_type_text() },
    ];

    let Icon = $derived(getTypeIcon(initialType));
    let typeLabel = $derived(
        typeOptions.find((o) => o.value === initialType)?.label,
    );

    // Reset edit state when props change
    $effect(() => {
        // If we are NOT editing locally, sync with props
        if (!isEditing) {
            currentType = initialType;
            currentQuestion = initialQuestion;
            currentOptions = [...initialOptions];
        }
    });

    function getTypeIcon(t: QuestionType) {
        switch (t) {
            case "single":
                return CircleCheck;
            case "multiple":
                return CheckSquare;
            case "text":
                return AlignLeft;
        }
    }

    function addOption() {
        currentOptions = [
            ...currentOptions,
            { id: crypto.randomUUID(), text: "" },
        ];
    }

    function removeOption(optionId: string) {
        currentOptions = currentOptions.filter((o) => o.id !== optionId);
    }

    function handleSave() {
        if (!currentQuestion.trim()) {
            return; // Or show error locally
        }

        if (currentType !== "text") {
            const validOptions = currentOptions.filter((o) => o.text.trim());
            if (validOptions.length === 0) {
                return; // Need at least one option
            }
        }

        // Clean up dnd properties before saving
        const cleanOptions = currentOptions.map((o) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [SHADOW_ITEM_MARKER_PROPERTY_NAME]: _, ...rest } = o;
            return rest;
        });

        // Pass initialEditMode: false to ensure subsequent re-renders (like drags) don't re-enter edit mode
        onSave?.({
            type: currentType,
            question: currentQuestion,
            options: cleanOptions,
            initialEditMode: false,
        });
        isEditing = false;
    }

    function toggleEdit() {
        isEditing = true;
    }

    function handleOptionDndConsider(e: CustomEvent<{ items: Option[] }>) {
        currentOptions = e.detail.items;
    }

    function handleOptionDndFinalize(e: CustomEvent<{ items: Option[] }>) {
        currentOptions = e.detail.items;
    }
</script>

<div
    class="question-item mb-3 rounded-lg border border-gray-200 p-3"
    class:opacity-50={isDragging}
>
    <div class="flex items-start gap-3">
        {#if contextEditMode}
            <div
                class="drag-handle mt-2 cursor-grab text-gray-400 hover:text-gray-600"
            >
                <GripVertical size={18} />
            </div>
        {/if}

        <div class="flex-1">
            <!-- Header: Type + Question (Same Row) -->
            <div class="mb-2 flex items-center gap-3">
                <!-- Type Selector / Icon -->
                <div class="w-32 flex-shrink-0">
                    {#if isEditing}
                        <select
                            bind:value={currentType}
                            class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:outline-none"
                        >
                            {#each typeOptions as opt (opt.value)}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    {:else}
                        <div
                            class="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-sm text-gray-600"
                        >
                            <Icon size={16} />
                            <span class="truncate">{typeLabel}</span>
                        </div>
                    {/if}
                </div>

                <!-- Question Text / Input -->
                <div class="flex-1">
                    {#if isEditing}
                        <input
                            type="text"
                            bind:value={currentQuestion}
                            placeholder={m.mentor_assignment_enter_question()}
                            class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:outline-none"
                        />
                    {:else}
                        <p
                            class="px-3 py-1.5 text-sm font-medium text-gray-900"
                        >
                            {initialQuestion}
                        </p>
                    {/if}
                </div>
            </div>

            {#if isEditing && !currentQuestion.trim()}
                <p class="mt-1 ml-32 pl-2 text-xs text-red-500">
                    {m.mentor_assignment_error_question_required()}
                </p>
            {/if}

            <!-- Options: Collapsible (Only visible in Edit Mode) -->
            {#if isEditing && currentType !== "text"}
                <div
                    class="options-list mt-3 ml-36 space-y-2"
                    use:dndzone={{
                        items: currentOptions,
                        flipDurationMs,
                        dragDisabled: false,
                        type: "option",
                    }}
                    onconsider={handleOptionDndConsider}
                    onfinalize={handleOptionDndFinalize}
                >
                    {#each currentOptions as option, idx (option.id)}
                        <div
                            class="flex items-center gap-2"
                            class:opacity-50={option[
                                SHADOW_ITEM_MARKER_PROPERTY_NAME
                            ]}
                        >
                            <button
                                type="button"
                                class="cursor-grab text-gray-400 hover:text-gray-600"
                            >
                                <GripVertical size={14} />
                            </button>
                            <span class="w-4 text-right text-sm text-gray-500"
                                >{idx + 1}.</span
                            >
                            <input
                                type="text"
                                bind:value={option.text}
                                placeholder="{m.mentor_assignment_option()} {idx +
                                    1}"
                                class="flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:ring-1 focus:ring-gray-400 focus:outline-none"
                            />
                            <button
                                type="button"
                                class="cursor-pointer p-1 text-gray-400 hover:text-red-500"
                                onclick={() => removeOption(option.id)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    {/each}

                    <button
                        type="button"
                        class="mt-2 ml-6 flex cursor-pointer items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                        onclick={addOption}
                    >
                        <Plus size={14} />
                        {m.mentor_assignment_option()}
                    </button>
                </div>
            {/if}
        </div>

        <!-- Action buttons -->
        <div class="mt-1 flex items-center gap-1">
            {#if isEditing}
                <button
                    type="button"
                    class="cursor-pointer p-1.5 text-gray-500 hover:text-green-600"
                    title={m.mentor_assignment_save()}
                    onclick={handleSave}
                >
                    <Save size={16} />
                </button>
            {:else}
                <button
                    type="button"
                    class="cursor-pointer p-1.5 text-gray-500 hover:text-gray-700"
                    onclick={toggleEdit}
                >
                    <Pencil size={16} />
                </button>
            {/if}
            <button
                type="button"
                class="cursor-pointer p-1.5 text-gray-400 hover:text-red-500"
                onclick={onDelete}
            >
                <Trash2 size={16} />
            </button>
        </div>
    </div>
</div>

<style>
    .question-item {
        background: #fafafa;
    }
</style>
