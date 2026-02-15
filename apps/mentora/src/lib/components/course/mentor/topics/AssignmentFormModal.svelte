<script lang="ts">
    import PopupModal from "$lib/components/ui/PopupModal.svelte";
    import QuestionItem from "./QuestionItem.svelte";
    import { Label, Input, Select, Textarea, Helper } from "flowbite-svelte";
    import { Button } from "flowbite-svelte";
    import { Plus } from "@lucide/svelte";
    import { SvelteSet } from "svelte/reactivity";
    import * as m from "$lib/paraglide/messages";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
    } from "svelte-dnd-action";

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
        [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean;
    }

    interface Assignment {
        id: string;
        title: string;
        introduction?: string;
        type: AssignmentType;
        prompt?: string;
        questions?: Question[];
        startAt?: string;
        dueAt?: string;
    }

    interface Props {
        open: boolean;
        mode: "create" | "edit";
        assignment?: Assignment;
        onSave?: (assignment: Assignment) => void;
        onCancel?: () => void;
    }

    let {
        open = $bindable(false),
        mode,
        assignment,
        onSave,
        onCancel,
    }: Props = $props();

    let assignmentType = $state<AssignmentType>("dialogue");
    let title = $state("");
    let introduction = $state("");
    let prompt = $state("");
    let questions = $state<Question[]>([]);
    let startAt = $state("");
    let dueAt = $state("");

    let errors = $state<{
        title?: string;
        prompt?: string;
        dates?: string;
        questions?: string;
    }>({});

    const flipDurationMs = 200;
    const DEFAULT_DUE_OFFSET_MS = 7 * 24 * 60 * 60 * 1000;

    function getNormalizedQuestionOptionsText(option: Option): string {
        return option.text.trim();
    }

    function hasDuplicateOptions(question: Question): boolean {
        if (question.type === "text") {
            return false;
        }

        const normalizedOptions = question.options
            .map(getNormalizedQuestionOptionsText)
            .filter((option) => option.length > 0);

        return new Set(normalizedOptions).size !== normalizedOptions.length;
    }

    function dedupeQuestionOptions(question: Question): Option[] {
        if (question.type === "text") {
            return [];
        }

        const seen = new SvelteSet<string>();
        const deduped = question.options
            .map((option) => {
                const text = getNormalizedQuestionOptionsText(option);
                return text.length > 0 ? { ...option, text } : null;
            })
            .filter((option): option is Option => Boolean(option))
            .filter((option) => {
                if (seen.has(option.text)) return false;
                seen.add(option.text);
                return true;
            });

        return deduped;
    }

    function toDateTimeInputValue(date: Date): string {
        // `datetime-local` expects local time format without timezone,
        // so convert from local Date to a local "YYYY-MM-DDTHH:mm" string.
        return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
            .toISOString()
            .slice(0, 16);
    }

    $effect(() => {
        if (!open) return;

        if (mode === "edit" && assignment) {
            assignmentType = assignment.type;
            title = assignment.title;
            introduction = assignment.introduction || "";
            prompt = assignment.prompt || "";
            questions = assignment.questions || [];
            startAt = assignment.startAt || "";
            dueAt = assignment.dueAt || "";
        } else if (mode === "create") {
            assignmentType = "dialogue";
            title = "";
            introduction = "";
            prompt = "";
            questions = [];
            const now = new Date();
            startAt = toDateTimeInputValue(now);
            dueAt = toDateTimeInputValue(
                new Date(now.getTime() + DEFAULT_DUE_OFFSET_MS),
            );
        }
    });

    const typeOptions = [
        { value: "dialogue", name: m.mentor_assignment_type_dialogue() },
        {
            value: "questionnaire",
            name: m.mentor_assignment_type_questionnaire(),
        },
    ];

    function handleSubmit() {
        errors = {};
        let isValid = true;

        if (!title.trim()) {
            errors.title = m.mentor_assignment_error_title_required();
            isValid = false;
        }

        if (assignmentType === "dialogue" && !prompt.trim()) {
            errors.prompt = m.mentor_assignment_error_prompt_required();
            isValid = false;
        }

        if (assignmentType === "questionnaire") {
            const hasInvalidQuestion = questions.some((question) => {
                if (!question.question.trim()) {
                    return true;
                }
                if (question.type !== "text") {
                    const hasNoValidOption = question.options.every(
                        (option) => !option.text.trim(),
                    );
                    if (hasNoValidOption) {
                        return true;
                    }
                    if (hasDuplicateOptions(question)) {
                        return true;
                    }
                }
                return false;
            });

            if (questions.length === 0 || hasInvalidQuestion) {
                errors.questions =
                    m.mentor_assignment_error_questions_required();
                isValid = false;
            }
        }

        if (startAt && dueAt && new Date(startAt) > new Date(dueAt)) {
            errors.dates = m.mentor_assignment_error_end_date_before_start();
            isValid = false;
        }

        if (!isValid) return;

        const assignmentData: Assignment = {
            id: assignment?.id || crypto.randomUUID(),
            title,
            introduction,
            type: assignmentType,
            startAt,
            dueAt,
        };

        if (assignmentType === "dialogue") {
            assignmentData.prompt = prompt;
        } else {
            assignmentData.questions = questions.map((question) => {
                const normalizedQuestion = { ...question };
                if (question.type === "text") {
                    return normalizedQuestion;
                }

                return {
                    ...normalizedQuestion,
                    options: dedupeQuestionOptions(question),
                };
            });
            // Strip internal drag state before sending to API
            assignmentData.questions = assignmentData.questions.map(
                (question) => {
                    const cleanedQuestion = { ...question };
                    delete cleanedQuestion[SHADOW_ITEM_MARKER_PROPERTY_NAME];
                    return cleanedQuestion;
                },
            );
        }

        onSave?.(assignmentData);
        open = false;
    }

    function handleCancel() {
        onCancel?.();
        open = false;
    }

    function addQuestion() {
        questions = [
            ...questions,
            {
                id: crypto.randomUUID(),
                type: "single",
                question: "",
                options: [
                    { id: crypto.randomUUID(), text: "" },
                    { id: crypto.randomUUID(), text: "" },
                ],
            },
        ];
    }

    function updateQuestion(
        questionId: string,
        data: {
            type: QuestionType;
            question: string;
            options: Option[];
        },
    ) {
        questions = questions.map((question) =>
            question.id === questionId ? { ...question, ...data } : question,
        );
    }

    function deleteQuestion(questionId: string) {
        questions = questions.filter((question) => question.id !== questionId);
    }

    function handleQuestionDndConsider(e: CustomEvent<{ items: Question[] }>) {
        questions = e.detail.items;
    }

    function handleQuestionDndFinalize(e: CustomEvent<{ items: Question[] }>) {
        questions = e.detail.items;
    }
</script>

{#snippet footer()}
    <div class="flex items-center justify-end gap-2">
        <Button
            color="alternative"
            onclick={handleCancel}
            class="cursor-pointer text-[#494949] hover:text-[#494949]/90"
        >
            {m.mentor_assignment_cancel()}
        </Button>
        <Button
            onclick={handleSubmit}
            class="cursor-pointer bg-[#494949] text-white hover:bg-[#494949]/90"
        >
            {m.mentor_assignment_save()}
        </Button>
    </div>
{/snippet}

<PopupModal
    bind:open
    title={mode === "create"
        ? m.mentor_topic_add_assignment()
        : m.mentor_topic_edit_assignment()}
    size="lg"
    {footer}
>
    <form
        class="custom-form flex flex-col space-y-4"
        onsubmit={(e) => e.preventDefault()}
    >
        <div class="grid grid-cols-2 gap-4">
            <Label>
                <span class="text-gray-700">{m.mentor_assignment_type()}</span>
                <Select items={typeOptions} bind:value={assignmentType} />
            </Label>

            <Label>
                <span class="text-gray-700">{m.mentor_assignment_name()}</span>
                <Input
                    type="text"
                    bind:value={title}
                    placeholder={m.mentor_assignment_name()}
                    color={errors.title ? "red" : undefined}
                />
                {#if errors.title}
                    <Helper class="mt-2" color="red">{errors.title}</Helper>
                {/if}
            </Label>
        </div>

        <Label>
            <span class="text-gray-700"
                >{m.mentor_assignment_introduction()}</span
            >
            <Textarea
                bind:value={introduction}
                rows={3}
                class="w-full"
                placeholder={m.mentor_assignment_introduction_placeholder()}
            />
        </Label>

        {#if assignmentType === "dialogue"}
            <Label>
                <span class="text-gray-700"
                    >{m.mentor_assignment_ai_prompt()}</span
                >
                <Textarea
                    bind:value={prompt}
                    rows={4}
                    placeholder={m.mentor_assignment_ai_prompt()}
                    class="w-full {errors.prompt
                        ? 'border-red-500 ring-red-500 focus:ring-red-500'
                        : ''}"
                />
                {#if errors.prompt}
                    <Helper class="mt-2" color="red">{errors.prompt}</Helper>
                {/if}
            </Label>
        {/if}

        {#if assignmentType === "questionnaire"}
            <div>
                <span class="mb-2 block text-sm font-medium text-gray-700"
                    >{m.mentor_assignment_questions()}</span
                >
                <div
                    class="questions-list space-y-2"
                    use:dndzone={{
                        items: questions,
                        flipDurationMs,
                        type: "question",
                    }}
                    onconsider={handleQuestionDndConsider}
                    onfinalize={handleQuestionDndFinalize}
                >
                    {#each questions as question (question.id)}
                        <QuestionItem
                            type={question.type}
                            question={question.question}
                            options={question.options}
                            isDragging={question[
                                SHADOW_ITEM_MARKER_PROPERTY_NAME
                            ]}
                            onSave={(data) => updateQuestion(question.id, data)}
                            onDelete={() => deleteQuestion(question.id)}
                        />
                    {/each}

                    <button
                        type="button"
                        class="flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                        onclick={addQuestion}
                    >
                        <Plus size={16} />
                        {m.mentor_assignment_add_question()}
                    </button>
                </div>
            </div>
        {/if}

        <div class="grid grid-cols-2 gap-4">
            <Label>
                <span class="text-gray-700"
                    >{m.mentor_assignment_start_time()}</span
                >
                <Input type="datetime-local" bind:value={startAt} />
            </Label>

            <Label>
                <span class="text-gray-700"
                    >{m.mentor_assignment_end_time()}</span
                >
                <Input
                    type="datetime-local"
                    bind:value={dueAt}
                    color={errors.dates ? "red" : undefined}
                />
            </Label>
        </div>
        {#if errors.dates}
            <Helper class="mt-2" color="red">{errors.dates}</Helper>
        {/if}
    </form>
</PopupModal>

<style>
    :global(.custom-form input:focus),
    :global(.custom-form select:focus),
    :global(.custom-form textarea:focus) {
        --tw-ring-color: #494949 !important;
        border-color: #494949 !important;
        box-shadow: 0 0 0 1px #494949 !important;
    }
</style>
