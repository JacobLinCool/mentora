<script lang="ts">
    import PopupModal from "$lib/components/ui/PopupModal.svelte";
    import FileTable from "$lib/components/course/mentor/table/FileTable.svelte";
    import QuestionItem from "./QuestionItem.svelte";
    import { Label, Input, Select, Textarea, Helper } from "flowbite-svelte";
    import { Button } from "flowbite-svelte";
    import { Plus, Sparkles } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
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
        initialEditMode?: boolean; // New property
        [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean;
    }

    interface FileItem {
        name: string;
        uploadedAt: string;
    }

    interface Assignment {
        id: string;
        title: string;
        introduction?: string;
        type: AssignmentType;
        prompt?: string;
        files?: FileItem[];
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

    // Form state
    let assignmentType = $state<AssignmentType>("dialogue");
    let title = $state("");
    let introduction = $state("");
    let prompt = $state("");
    let files = $state<FileItem[]>([]);
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

    // Load assignment data when editing
    $effect(() => {
        if (mode === "edit" && assignment) {
            assignmentType = assignment.type;
            title = assignment.title;
            introduction = assignment.introduction || "";
            prompt = assignment.prompt || "";
            files = assignment.files || [];
            questions = assignment.questions || [];
            startAt = assignment.startAt || "";
            dueAt = assignment.dueAt || "";
        } else if (mode === "create") {
            // Reset form for create mode
            assignmentType = "dialogue";
            title = "";
            introduction = "";
            prompt = "";
            files = [];
            questions = [];
            startAt = "";
            dueAt = "";
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
        // Reset errors
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

        if (assignmentType === "questionnaire" && questions.length === 0) {
            errors.questions = m.mentor_assignment_error_questions_required();
            isValid = false;
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
            assignmentData.files = files;
        } else {
            // Clean up internal dnd properties before saving
            assignmentData.questions = questions.map((q) => {
                const copy = { ...q };
                delete copy[SHADOW_ITEM_MARKER_PROPERTY_NAME];
                delete copy.initialEditMode;
                return copy;
            });
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
                initialEditMode: true,
            },
        ];
    }

    function updateQuestion(
        questionId: string,
        data: {
            type: QuestionType;
            question: string;
            options: Option[];
            initialEditMode?: boolean;
        },
    ) {
        questions = questions.map((q) =>
            q.id === questionId ? { ...q, ...data } : q,
        );
    }

    function deleteQuestion(questionId: string) {
        questions = questions.filter((q) => q.id !== questionId);
    }

    function handleFileUpload() {
        // Mock file upload - in real implementation would open file picker
        files = [
            ...files,
            {
                name: `file_${Date.now()}.pdf`,
                uploadedAt: new Date().toLocaleString("zh-TW"),
            },
        ];
    }

    function handleDeleteFile(index: number) {
        files = files.filter((_, i) => i !== index);
        // Also update assignment object if we are in edit mode to ensure changes persist if submit happens immediately
        if (assignment) {
            assignment.files = files;
        }
    }

    function handleQuestionDndConsider(e: CustomEvent<{ items: Question[] }>) {
        questions = e.detail.items;
    }

    function handleQuestionDndFinalize(e: CustomEvent<{ items: Question[] }>) {
        questions = e.detail.items;
    }

    function handleGenerateIntroduction() {
        // Mock AI generation
        introduction = "AI generated introduction...";
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
        <!-- Type + Name on same row -->
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

        <!-- Introduction Field -->
        <Label>
            <div class="mb-2 flex items-center justify-between">
                <span class="text-gray-700"
                    >{m.mentor_assignment_introduction()}</span
                >
                <Button
                    size="xs"
                    class="cursor-pointer border border-gray-300 !bg-transparent text-gray-500 hover:bg-transparent hover:text-gray-700 focus:ring-0"
                    onclick={handleGenerateIntroduction}
                >
                    <Sparkles class="mr-1 h-3 w-3" />
                    {m.mentor_assignment_ai_generate()}
                </Button>
            </div>
            <Textarea
                bind:value={introduction}
                rows={3}
                class="w-full"
                placeholder={m.mentor_assignment_introduction_placeholder()}
            />
        </Label>

        <!-- Dialogue-specific fields -->
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

            <div>
                <span class="mb-2 block text-sm font-medium text-gray-700"
                    >{m.mentor_assignment_ai_references()}</span
                >
                <FileTable
                    {files}
                    onUpload={handleFileUpload}
                    onDelete={handleDeleteFile}
                    showUploadButton={true}
                />
            </div>
        {/if}

        <!-- Questionnaire-specific fields -->
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
                            editMode={true}
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

        <!-- Start/End Time -->
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
