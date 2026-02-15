<script lang="ts">
    import { GripVertical, Trash2, Plus } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
    } from "svelte-dnd-action";

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
        isDragging?: boolean;
        onDelete?: () => void;
        onSave?: (data: {
            type: QuestionType;
            question: string;
            options: Option[];
        }) => void;
    }

    let {
        type,
        question,
        options,
        isDragging = false,
        onDelete,
        onSave,
    }: Props = $props();

    let localType = $state<QuestionType>("single");
    let localQuestion = $state("");
    let localOptions = $state<Option[]>([]);

    const flipDurationMs = 200;

    const typeOptions: { value: QuestionType; label: string }[] = [
        { value: "single", label: m.mentor_assignment_question_type_single() },
        {
            value: "multiple",
            label: m.mentor_assignment_question_type_multiple(),
        },
        { value: "text", label: m.mentor_assignment_question_type_text() },
    ];

    $effect(() => {
        localType = type;
        localQuestion = question;
        localOptions = [...options];
    });

    function emitChange() {
        const cleanOptions = localOptions.map((option) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [SHADOW_ITEM_MARKER_PROPERTY_NAME]: _, ...rest } = option;
            return rest;
        });

        onSave?.({
            type: localType,
            question: localQuestion,
            options: cleanOptions,
        });
    }

    function addOption() {
        localOptions = [...localOptions, { id: crypto.randomUUID(), text: "" }];
        emitChange();
    }

    function removeOption(optionId: string) {
        localOptions = localOptions.filter((o) => o.id !== optionId);
        emitChange();
    }

    function handleQuestionDndConsider(e: CustomEvent<{ items: Option[] }>) {
        localOptions = e.detail.items;
        emitChange();
    }

    function handleQuestionDndFinalize(e: CustomEvent<{ items: Option[] }>) {
        localOptions = e.detail.items;
        emitChange();
    }

    function handleTypeChange() {
        emitChange();
    }

    function handleQuestionInput() {
        emitChange();
    }

    function handleOptionInput() {
        emitChange();
    }
</script>

<div
    class="question-item mb-3 rounded-lg border border-gray-200 p-3"
    class:opacity-50={isDragging}
>
    <div class="flex items-start gap-3">
        <div
            class="drag-handle mt-2 cursor-grab text-gray-400 hover:text-gray-600"
        >
            <GripVertical size={18} />
        </div>

        <div class="flex-1">
            <!-- Header: Type + Question -->
            <div class="mb-2 flex items-center gap-3">
                <!-- Type Selector -->
                <div class="w-32 flex-shrink-0">
                    <select
                        bind:value={localType}
                        class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:outline-none"
                        onchange={handleTypeChange}
                    >
                        {#each typeOptions as opt (opt.value)}
                            <option value={opt.value}>{opt.label}</option>
                        {/each}
                    </select>
                </div>

                <!-- Question Text -->
                <div class="flex-1">
                    <input
                        type="text"
                        bind:value={localQuestion}
                        placeholder={m.mentor_assignment_enter_question()}
                        class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:outline-none"
                        oninput={handleQuestionInput}
                    />
                </div>
            </div>

            {#if !localQuestion.trim()}
                <p class="mt-1 ml-32 pl-2 text-xs text-red-500">
                    {m.mentor_assignment_error_question_required()}
                </p>
            {/if}

            <!-- Options -->
            {#if localType !== "text"}
                <div
                    class="options-list mt-3 ml-36 space-y-2"
                    use:dndzone={{
                        items: localOptions,
                        flipDurationMs,
                        dragDisabled: false,
                        type: "option",
                    }}
                    onconsider={handleQuestionDndConsider}
                    onfinalize={handleQuestionDndFinalize}
                >
                    {#each localOptions as option, idx (option.id)}
                        <div
                            class="flex items-center gap-2"
                            class:opacity-50={option[
                                SHADOW_ITEM_MARKER_PROPERTY_NAME
                            ]}
                        >
                            <button
                                type="button"
                                class="cursor-grab text-gray-400 hover:text-gray-600"
                                aria-label={m.mentor_assignment_reorder_option()}
                            >
                                <GripVertical size={14} />
                            </button>
                            <span class="w-4 text-right text-sm text-gray-500"
                                >{idx + 1}.</span
                            >
                            <input
                                type="text"
                                bind:value={option.text}
                                placeholder={`${m.mentor_assignment_option()} ${idx + 1}`}
                                class="flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:ring-1 focus:ring-gray-400 focus:outline-none"
                                oninput={handleOptionInput}
                            />
                            <button
                                type="button"
                                class="cursor-pointer p-1 text-gray-400 hover:text-red-500"
                                onclick={() => removeOption(option.id)}
                                aria-label={m.delete()}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    {/each}

                    <button
                        type="button"
                        class="mt-2 ml-6 flex cursor-pointer items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                        onclick={addOption}
                        aria-label={m.mentor_assignment_add_option()}
                    >
                        <Plus size={14} />
                        {m.mentor_assignment_option()}
                    </button>
                </div>
            {/if}
        </div>

        <!-- Delete button -->
        <div class="mt-1 flex items-center gap-1">
            <button
                type="button"
                class="cursor-pointer p-1.5 text-gray-400 hover:text-red-500"
                onclick={onDelete}
                aria-label={m.delete()}
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
