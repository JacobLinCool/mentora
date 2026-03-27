<script lang="ts">
    import {
        ChevronDown,
        ChevronRight,
        LoaderCircle,
        PenLine,
    } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
    import Table from "$lib/components/ui/Table.svelte";
    import PopupModal from "$lib/components/ui/PopupModal.svelte";
    import { api } from "$lib/api";
    import type {
        SubmissionWithId,
        Questionnaire,
        QuestionnaireResponse,
    } from "$lib/api";
    import { formatMentoraDateTime } from "$lib/features/datetime/format";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";

    let { courseId }: { courseId: string } = $props();

    // --- Types ---
    type ItemType = "dialogue" | "questionnaire";
    type SelectableItem = {
        id: string;
        title: string;
        type: ItemType;
    };

    type SubmissionRow = {
        id: string;
        userId: string;
        student: string;
        state: string;
        submittedAt: string;
        late: boolean;
        scoreCompletion: string;
        [key: string]: unknown;
    };

    type ResponseRow = {
        id: string;
        userId: string;
        student: string;
        submittedAt: string;
        responsePreview: string;
        answeredCount: number;
        responseItems: Array<{
            questionLabel: string;
            questionText: string;
            answer: string;
        }>;
        [key: string]: unknown;
    };

    type QuestionnaireView = "summary" | "individual";

    type QuestionnaireSummaryOption = {
        label: string;
        count: number;
        percentage: number;
    };

    type QuestionnaireTextAnswer = {
        student: string;
        submittedAt: string;
        answer: string;
    };

    type QuestionnaireSummaryCard = {
        id: string;
        title: string;
        type:
            | "single_answer_choice"
            | "multiple_answer_choice"
            | "short_answer"
            | "slider_answer";
        required: boolean;
        answeredCount: number;
        options: QuestionnaireSummaryOption[];
        textAnswers: QuestionnaireTextAnswer[];
        sliderAverage: number | null;
        sliderMin: number | null;
        sliderMax: number | null;
        sliderMinLabel?: string;
        sliderMaxLabel?: string;
    };

    // --- State ---
    let items = $state<SelectableItem[]>([]);
    let selectedItemId = $state("");
    let loading = $state(false);
    let loadingList = $state(false);
    let error = $state<string | null>(null);

    // Submission data (dialogue assignments)
    let submissionRows = $state<SubmissionRow[]>([]);
    let rawSubmissions = $state<SubmissionWithId[]>([]);

    // Response data (questionnaires)
    let responseRows = $state<ResponseRow[]>([]);
    let rawResponses = $state<QuestionnaireResponse[]>([]);
    let questionnaireView = $state<QuestionnaireView>("summary");
    let questionnaireSummaryCards = $state<QuestionnaireSummaryCard[]>([]);
    let expandedResponseRowId = $state<string | null>(null);

    // User name cache
    const userNameCache = new SvelteMap<string, string>();

    // Grading modal state
    let gradingOpen = $state(false);
    let gradingUserId = $state("");
    let gradingStudentName = $state("");
    let gradingScore = $state<number | null>(null);
    let gradingNotes = $state("");
    let gradingSaving = $state(false);
    let gradingSuccess = $state<string | null>(null);
    let gradingError = $state<string | null>(null);

    // --- Derived ---
    let selectedItem = $derived(items.find((i) => i.id === selectedItemId));

    // --- Lifecycle ---
    onMount(() => {
        void loadItems();
    });

    // --- Loaders ---
    async function loadItems() {
        loading = true;
        error = null;
        try {
            const [assignmentsRes, questionnairesRes] = await Promise.all([
                api.assignments.listForCourse(courseId),
                api.questionnaires.listForCourse(courseId),
            ]);

            const list: SelectableItem[] = [];

            if (assignmentsRes.success) {
                for (const a of assignmentsRes.data) {
                    list.push({
                        id: a.id,
                        title: a.title,
                        type: "dialogue",
                    });
                }
            }
            if (questionnairesRes.success) {
                for (const q of questionnairesRes.data) {
                    list.push({
                        id: q.id,
                        title: q.title,
                        type: "questionnaire",
                    });
                }
            }

            items = list;
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load items";
        } finally {
            loading = false;
        }
    }

    async function resolveUserName(userId: string): Promise<string> {
        if (userNameCache.has(userId)) {
            return userNameCache.get(userId)!;
        }
        try {
            const res = await api.users.getProfile(userId);
            const name =
                res.success && res.data.displayName
                    ? res.data.displayName
                    : userId.substring(0, 8);
            userNameCache.set(userId, name);
            return name;
        } catch {
            const fallback = userId.substring(0, 8);
            userNameCache.set(userId, fallback);
            return fallback;
        }
    }

    async function handleItemChange() {
        if (!selectedItemId || !selectedItem) {
            submissionRows = [];
            responseRows = [];
            rawSubmissions = [];
            rawResponses = [];
            questionnaireSummaryCards = [];
            expandedResponseRowId = null;
            return;
        }

        loadingList = true;
        error = null;

        try {
            if (selectedItem.type === "dialogue") {
                await loadSubmissions(selectedItemId);
            } else {
                await loadResponses(selectedItemId);
            }
        } catch (e) {
            error =
                e instanceof Error ? e.message : "Failed to load submissions";
        } finally {
            loadingList = false;
        }
    }

    async function loadSubmissions(assignmentId: string) {
        rawResponses = [];
        questionnaireSummaryCards = [];
        expandedResponseRowId = null;
        const res = await api.submissions.listForAssignment(assignmentId);
        if (!res.success) {
            error = res.error;
            return;
        }

        rawSubmissions = res.data;

        const userIds = [
            ...new Set(res.data.map((s: SubmissionWithId) => s.userId)),
        ];
        await Promise.all(userIds.map(resolveUserName));

        submissionRows = res.data.map((s: SubmissionWithId) => ({
            id: s.id,
            userId: s.userId,
            student: userNameCache.get(s.userId) || s.userId.substring(0, 8),
            state: s.state,
            submittedAt: formatMentoraDateTime(s.submittedAt),
            late: s.late,
            scoreCompletion:
                s.scoreCompletion != null ? String(s.scoreCompletion) : "-",
        }));
    }

    async function loadResponses(questionnaireId: string) {
        const [responsesRes, questionnaireRes] = await Promise.all([
            api.questionnaireResponses.listForQuestionnaire(questionnaireId),
            api.questionnaires.get(questionnaireId),
        ]);

        if (!responsesRes.success) {
            error = responsesRes.error;
            return;
        }

        if (!questionnaireRes.success) {
            error = questionnaireRes.error;
            return;
        }

        rawResponses = responsesRes.data;

        const userIds = [
            ...new Set(
                responsesRes.data.map((r: QuestionnaireResponse) => r.userId),
            ),
        ];
        await Promise.all(userIds.map(resolveUserName));

        responseRows = responsesRes.data.map(
            (r: QuestionnaireResponse, idx: number) => {
                const responseSummary = summarizeQuestionnaireResponse(
                    questionnaireRes.data,
                    r,
                );

                return {
                    id: `${r.userId}-${idx}`,
                    userId: r.userId,
                    student:
                        userNameCache.get(r.userId) || r.userId.substring(0, 8),
                    submittedAt: formatMentoraDateTime(r.submittedAt),
                    responsePreview: responseSummary.preview,
                    answeredCount: responseSummary.items.length,
                    responseItems: responseSummary.items,
                };
            },
        );

        questionnaireSummaryCards = buildQuestionnaireSummary(
            questionnaireRes.data,
            responsesRes.data,
        );
        questionnaireView = "summary";
        expandedResponseRowId = responseRows[0]?.id ?? null;
    }

    // --- Grading ---
    function openGradeModal(row: SubmissionRow) {
        const sub = rawSubmissions.find((s) => s.userId === row.userId);
        gradingUserId = row.userId;
        gradingStudentName = row.student;
        gradingScore = sub?.scoreCompletion ?? null;
        gradingNotes = sub?.notes ?? "";
        gradingSuccess = null;
        gradingError = null;
        gradingOpen = true;
    }

    async function saveGrade() {
        if (!selectedItemId || !gradingUserId) return;

        gradingSaving = true;
        gradingError = null;
        gradingSuccess = null;

        try {
            const res = await api.submissions.grade(
                selectedItemId,
                gradingUserId,
                {
                    scoreCompletion: gradingScore,
                    notes: gradingNotes || null,
                    state: "graded_complete",
                },
            );

            if (!res.success) {
                gradingError = m.mentor_submissions_grade_failed();
                return;
            }

            gradingSuccess = m.mentor_submissions_grade_success();
            // Reload after short delay so user sees success message
            setTimeout(async () => {
                gradingOpen = false;
                await loadSubmissions(selectedItemId);
            }, 1000);
        } catch {
            gradingError = m.mentor_submissions_grade_failed();
        } finally {
            gradingSaving = false;
        }
    }

    function statusLabel(state: string): string {
        switch (state) {
            case "in_progress":
                return m.mentor_submissions_status_in_progress();
            case "submitted":
                return m.mentor_submissions_status_submitted();
            case "graded_complete":
                return m.mentor_submissions_status_graded();
            default:
                return state;
        }
    }

    function statusColor(state: string): string {
        switch (state) {
            case "in_progress":
                return "bg-yellow-100 text-yellow-800";
            case "submitted":
                return "bg-blue-100 text-blue-800";
            case "graded_complete":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    }

    function toPercentage(count: number, total: number): number {
        if (total <= 0) return 0;
        return Math.round((count / total) * 1000) / 10;
    }

    function getSelectableItemLabel(item: SelectableItem): string {
        return `[${
            item.type === "dialogue"
                ? m.mentor_submissions_type_dialogue()
                : m.mentor_submissions_type_questionnaire()
        }] ${item.title}`;
    }

    function getQuestionTypeLabel(
        type: QuestionnaireSummaryCard["type"],
    ): string {
        switch (type) {
            case "single_answer_choice":
                return m.mentor_submissions_question_type_single_choice();
            case "multiple_answer_choice":
                return m.mentor_submissions_question_type_multiple_choice();
            case "short_answer":
                return m.mentor_submissions_question_type_short_answer();
            case "slider_answer":
                return m.mentor_submissions_question_type_slider();
            default:
                return type;
        }
    }

    function toggleResponseRow(rowId: string) {
        expandedResponseRowId = expandedResponseRowId === rowId ? null : rowId;
    }

    function buildQuestionnaireSummary(
        questionnaire: Questionnaire,
        responses: QuestionnaireResponse[],
    ): QuestionnaireSummaryCard[] {
        return questionnaire.questions.map((entry, questionIndex) => {
            const question = entry.question;
            const answers = responses
                .map((response) => {
                    const matched = response.responses.find(
                        (item) => item.questionIndex === questionIndex,
                    );
                    if (!matched) return null;

                    return {
                        answer: matched.answer,
                        student:
                            userNameCache.get(response.userId) ||
                            response.userId.substring(0, 8),
                        submittedAt: formatMentoraDateTime(
                            response.submittedAt,
                        ),
                    };
                })
                .filter(
                    (
                        item,
                    ): item is {
                        answer: QuestionnaireResponse["responses"][number]["answer"];
                        student: string;
                        submittedAt: string;
                    } => item !== null,
                );

            const baseCard: QuestionnaireSummaryCard = {
                id: `summary-${questionIndex}`,
                title: question.questionText,
                type: question.type,
                required: entry.required,
                answeredCount: answers.length,
                options: [],
                textAnswers: [],
                sliderAverage: null,
                sliderMin: null,
                sliderMax: null,
            };

            if (question.type === "single_answer_choice") {
                baseCard.options = question.options.map((option) => {
                    const count = answers.filter(
                        (item) => item.answer.response === option,
                    ).length;
                    return {
                        label: option,
                        count,
                        percentage: toPercentage(count, answers.length),
                    };
                });
                return baseCard;
            }

            if (question.type === "multiple_answer_choice") {
                baseCard.options = question.options.map((option) => {
                    const count = answers.filter((item) => {
                        return (
                            Array.isArray(item.answer.response) &&
                            item.answer.response.includes(option)
                        );
                    }).length;

                    return {
                        label: option,
                        count,
                        percentage: toPercentage(count, answers.length),
                    };
                });
                return baseCard;
            }

            if (question.type === "short_answer") {
                baseCard.textAnswers = answers.map((item) => ({
                    student: item.student,
                    submittedAt: item.submittedAt,
                    answer: String(item.answer.response),
                }));
                return baseCard;
            }

            const sliderValues = answers
                .map((item) =>
                    typeof item.answer.response === "number"
                        ? item.answer.response
                        : null,
                )
                .filter((value): value is number => value !== null);

            if (sliderValues.length > 0) {
                const uniqueValues = Array.from(new Set(sliderValues)).sort(
                    (a, b) => a - b,
                );

                baseCard.options = uniqueValues.map((value) => {
                    const count = sliderValues.filter(
                        (item) => item === value,
                    ).length;
                    return {
                        label: String(value),
                        count,
                        percentage: toPercentage(count, sliderValues.length),
                    };
                });
                baseCard.sliderAverage =
                    Math.round(
                        (sliderValues.reduce((sum, value) => sum + value, 0) /
                            sliderValues.length) *
                            10,
                    ) / 10;
                baseCard.sliderMin = Math.min(...sliderValues);
                baseCard.sliderMax = Math.max(...sliderValues);
            }

            baseCard.sliderMinLabel = question.minLabel;
            baseCard.sliderMaxLabel = question.maxLabel;
            return baseCard;
        });
    }

    function summarizeQuestionnaireResponse(
        questionnaire: Questionnaire,
        response: QuestionnaireResponse,
    ): {
        preview: string;
        items: Array<{
            questionLabel: string;
            questionText: string;
            answer: string;
        }>;
    } {
        const items = response.responses
            .sort((a, b) => a.questionIndex - b.questionIndex)
            .map((item) => {
                const question = questionnaire.questions[item.questionIndex];
                const answerText = formatAnswer(item.answer, question);
                if (!answerText.trim()) return null;
                return {
                    questionLabel: `Q${item.questionIndex + 1}`,
                    questionText: question?.question.questionText ?? "",
                    answer: answerText,
                };
            })
            .filter(
                (
                    item,
                ): item is {
                    questionLabel: string;
                    questionText: string;
                    answer: string;
                } => Boolean(item),
            );

        return {
            preview: items
                .map((item) => `${item.questionLabel}: ${item.answer}`)
                .join("｜"),
            items,
        };
    }

    function formatAnswer(
        answer: {
            type: string;
            response: string | string[] | number;
        },
        question?: {
            question: {
                type: string;
                questionText: string;
                options?: string[];
                minLabel?: string;
                maxLabel?: string;
                minValue?: number;
                maxValue?: number;
            };
        },
    ): string {
        if (answer.type === "single_answer_choice") {
            return String(answer.response);
        }
        if (answer.type === "multiple_answer_choice") {
            return (answer.response as string[]).join(", ");
        }
        if (answer.type === "short_answer") {
            return String(answer.response);
        }
        if (answer.type === "slider_answer") {
            const val = String(answer.response);
            if (question?.question && "minLabel" in question.question) {
                return `${val} (${question.question.minLabel} - ${question.question.maxLabel})`;
            }
            return val;
        }
        return String(answer.response);
    }
</script>

{#if error}
    <div
        class="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600"
    >
        {error}
    </div>
{/if}

{#if loading}
    <div class="flex items-center justify-center p-8 text-gray-500">
        <LoaderCircle size={20} class="mr-2 animate-spin" />
        {m.loading()}
    </div>
{:else if items.length === 0}
    <div class="p-8 text-center text-gray-500">
        {m.mentor_submissions_no_items()}
    </div>
{:else}
    <!-- Item Selector -->
    <div class="mb-6">
        <label
            for="item-select"
            class="mb-2 block text-sm font-medium text-gray-700"
        >
            {m.mentor_submissions_select()}
        </label>
        <select
            id="item-select"
            bind:value={selectedItemId}
            onchange={handleItemChange}
            class="w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
        >
            <option value="">{m.mentor_submissions_select()}</option>
            {#each items as item (item.id)}
                <option value={item.id}>{getSelectableItemLabel(item)}</option>
            {/each}
        </select>
    </div>

    {#if selectedItemId}
        {#if loadingList}
            <div class="flex items-center justify-center p-8 text-gray-500">
                <LoaderCircle size={20} class="mr-2 animate-spin" />
                {m.loading()}
            </div>
        {:else if selectedItem?.type === "dialogue"}
            <!-- Submission Table -->
            {#if submissionRows.length === 0}
                <div class="p-8 text-center text-gray-500">
                    {m.mentor_submissions_no_results()}
                </div>
            {:else}
                <div
                    class="overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                    <Table
                        columns={[
                            {
                                key: "student",
                                label: m.mentor_submissions_student(),
                                sortable: true,
                            },
                            {
                                key: "state",
                                label: m.mentor_submissions_status(),
                                sortable: true,
                            },
                            {
                                key: "submittedAt",
                                label: m.mentor_submissions_submitted_at(),
                                sortable: true,
                            },
                            {
                                key: "late",
                                label: m.mentor_submissions_late(),
                                sortable: true,
                            },
                            {
                                key: "scoreCompletion",
                                label: m.mentor_submissions_score(),
                                sortable: true,
                            },
                        ]}
                        data={submissionRows}
                        renderCell={renderSubmissionCell}
                        actions={renderSubmissionActions}
                    />
                </div>
            {/if}
        {:else if selectedItem?.type === "questionnaire"}
            <!-- Response Table -->
            <div class="space-y-4">
                <div
                    class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                    <div
                        class="inline-flex w-fit rounded-full border border-gray-200 bg-white p-1 shadow-sm"
                    >
                        <button
                            type="button"
                            class={questionnaireView === "summary"
                                ? "cursor-pointer rounded-full bg-[#4b4b4b] px-4 py-2 text-sm font-medium text-white"
                                : "cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"}
                            onclick={() => (questionnaireView = "summary")}
                        >
                            {m.mentor_submissions_view_summary()}
                        </button>
                        <button
                            type="button"
                            class={questionnaireView === "individual"
                                ? "cursor-pointer rounded-full bg-[#4b4b4b] px-4 py-2 text-sm font-medium text-white"
                                : "cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"}
                            onclick={() => (questionnaireView = "individual")}
                        >
                            {m.mentor_submissions_view_individual()}
                        </button>
                    </div>
                    <div class="text-sm text-gray-500">
                        {m.mentor_submissions_total_responses({
                            count: rawResponses.length,
                        })}
                    </div>
                </div>

                {#if responseRows.length === 0}
                    <div class="p-8 text-center text-gray-500">
                        {m.mentor_submissions_no_results()}
                    </div>
                {:else if questionnaireView === "individual"}
                    <div class="space-y-3">
                        {#each responseRows as row (row.id)}
                            <section
                                class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                            >
                                <button
                                    type="button"
                                    class="flex w-full cursor-pointer items-start justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50"
                                    onclick={() => toggleResponseRow(row.id)}
                                >
                                    <div class="min-w-0 flex-1">
                                        <div
                                            class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div
                                                class="text-base font-semibold text-gray-900"
                                            >
                                                {row.student}
                                            </div>
                                            <div class="text-sm text-gray-500">
                                                {row.submittedAt}
                                            </div>
                                        </div>
                                        <div
                                            class="mt-2 flex flex-wrap items-center gap-2"
                                        >
                                            <span
                                                class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                                            >
                                                {m.mentor_submissions_answered_questions(
                                                    {
                                                        count: row.answeredCount,
                                                    },
                                                )}
                                            </span>
                                            {#each row.responseItems.slice(0, 2) as responseItem (responseItem.questionLabel + responseItem.answer)}
                                                <span
                                                    class="inline-flex max-w-[18rem] items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600"
                                                >
                                                    <span
                                                        class="font-semibold text-gray-500"
                                                    >
                                                        {responseItem.questionLabel}
                                                    </span>
                                                    <span class="truncate">
                                                        {responseItem.answer}
                                                    </span>
                                                </span>
                                            {/each}
                                            {#if row.responseItems.length > 2}
                                                <span
                                                    class="text-xs text-gray-400"
                                                >
                                                    {m.mentor_submissions_more_questions(
                                                        {
                                                            count:
                                                                row
                                                                    .responseItems
                                                                    .length - 2,
                                                        },
                                                    )}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="mt-0.5 shrink-0 text-gray-400">
                                        {#if expandedResponseRowId === row.id}
                                            <ChevronDown size={18} />
                                        {:else}
                                            <ChevronRight size={18} />
                                        {/if}
                                    </div>
                                </button>

                                {#if expandedResponseRowId === row.id}
                                    <div
                                        class="border-t border-gray-100 bg-[#fafafa] px-3 py-4 md:px-4"
                                    >
                                        <div class="space-y-3">
                                            {#each row.responseItems as responseItem (responseItem.questionLabel + responseItem.answer)}
                                                <article
                                                    class="rounded-xl border border-gray-200 bg-white px-3 py-3"
                                                >
                                                    <h4
                                                        class="text-sm font-semibold text-gray-900"
                                                    >
                                                        {responseItem.questionLabel}
                                                        {#if responseItem.questionText}
                                                            {` ${responseItem.questionText}`}
                                                        {/if}
                                                    </h4>
                                                    <p
                                                        class="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-gray-700"
                                                    >
                                                        {responseItem.answer}
                                                    </p>
                                                </article>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            </section>
                        {/each}
                    </div>
                {:else}
                    <div class="grid gap-4">
                        {#each questionnaireSummaryCards as card (card.id)}
                            <section
                                class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                            >
                                <div
                                    class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between"
                                >
                                    <div>
                                        <h3
                                            class="text-base font-semibold text-gray-900"
                                        >
                                            {card.title}
                                        </h3>
                                        <p class="mt-1 text-sm text-gray-500">
                                            {getQuestionTypeLabel(card.type)}
                                            ・{card.required
                                                ? m.mentor_submissions_required()
                                                : m.mentor_submissions_optional()}
                                            ・{m.mentor_submissions_answered_responses(
                                                {
                                                    count: card.answeredCount,
                                                },
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {#if card.type === "short_answer"}
                                    <div class="space-y-3">
                                        {#each card.textAnswers as answer, index (answer.student + answer.submittedAt + index)}
                                            <article
                                                class="rounded-xl border border-gray-200 bg-gray-50 p-4"
                                            >
                                                <div
                                                    class="mb-2 flex flex-col gap-1 text-sm text-gray-500 md:flex-row md:items-center md:justify-between"
                                                >
                                                    <span
                                                        class="font-medium text-gray-700"
                                                        >{answer.student}</span
                                                    >
                                                    <span
                                                        >{answer.submittedAt}</span
                                                    >
                                                </div>
                                                <p
                                                    class="text-sm leading-relaxed whitespace-pre-wrap text-gray-800"
                                                >
                                                    {answer.answer}
                                                </p>
                                            </article>
                                        {/each}
                                    </div>
                                {:else}
                                    {#if card.type === "slider_answer" && card.sliderAverage != null}
                                        <div
                                            class="mb-4 grid gap-3 md:grid-cols-3"
                                        >
                                            <div
                                                class="rounded-xl bg-gray-50 px-4 py-3"
                                            >
                                                <div
                                                    class="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                                >
                                                    {m.mentor_submissions_average()}
                                                </div>
                                                <div
                                                    class="mt-1 text-2xl font-semibold text-gray-900"
                                                >
                                                    {card.sliderAverage}
                                                </div>
                                            </div>
                                            <div
                                                class="rounded-xl bg-gray-50 px-4 py-3"
                                            >
                                                <div
                                                    class="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                                >
                                                    {m.mentor_submissions_min()}
                                                </div>
                                                <div
                                                    class="mt-1 text-2xl font-semibold text-gray-900"
                                                >
                                                    {card.sliderMin}
                                                </div>
                                                {#if card.sliderMinLabel}
                                                    <div
                                                        class="mt-1 text-xs text-gray-500"
                                                    >
                                                        {card.sliderMinLabel}
                                                    </div>
                                                {/if}
                                            </div>
                                            <div
                                                class="rounded-xl bg-gray-50 px-4 py-3"
                                            >
                                                <div
                                                    class="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                                >
                                                    {m.mentor_submissions_max()}
                                                </div>
                                                <div
                                                    class="mt-1 text-2xl font-semibold text-gray-900"
                                                >
                                                    {card.sliderMax}
                                                </div>
                                                {#if card.sliderMaxLabel}
                                                    <div
                                                        class="mt-1 text-xs text-gray-500"
                                                    >
                                                        {card.sliderMaxLabel}
                                                    </div>
                                                {/if}
                                            </div>
                                        </div>
                                    {/if}

                                    <div class="space-y-3">
                                        {#each card.options as option (option.label)}
                                            <div class="space-y-1">
                                                <div
                                                    class="flex items-center justify-between gap-4 text-sm"
                                                >
                                                    <span
                                                        class="font-medium text-gray-700"
                                                        >{option.label}</span
                                                    >
                                                    <span class="text-gray-500"
                                                        >{m.mentor_submissions_people_percentage(
                                                            {
                                                                count: option.count,
                                                                percentage:
                                                                    option.percentage,
                                                            },
                                                        )}</span
                                                    >
                                                </div>
                                                <div
                                                    class="h-2.5 overflow-hidden rounded-full bg-gray-100"
                                                >
                                                    <div
                                                        class="h-full rounded-full bg-[#4b4b4b]"
                                                        style={`width: ${option.percentage}%`}
                                                    ></div>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </section>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    {/if}
{/if}

<!-- Grading Modal -->
<PopupModal bind:open={gradingOpen} title={m.mentor_submissions_grade_title()}>
    <div class="space-y-4">
        <div>
            <span class="mb-1 block text-sm font-medium text-gray-700">
                {m.mentor_submissions_student()}
            </span>
            <div class="text-sm text-gray-600">{gradingStudentName}</div>
        </div>

        <div>
            <label
                for="grade-score"
                class="mb-1 block text-sm font-medium text-gray-700"
            >
                {m.mentor_submissions_score_label()}
            </label>
            <input
                id="grade-score"
                type="number"
                min="0"
                max="100"
                bind:value={gradingScore}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
            />
        </div>

        <div>
            <label
                for="grade-notes"
                class="mb-1 block text-sm font-medium text-gray-700"
            >
                {m.mentor_submissions_notes_label()}
            </label>
            <textarea
                id="grade-notes"
                rows="3"
                bind:value={gradingNotes}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
            ></textarea>
        </div>

        {#if gradingError}
            <div class="text-sm text-red-600">{gradingError}</div>
        {/if}
        {#if gradingSuccess}
            <div class="text-sm text-green-600">{gradingSuccess}</div>
        {/if}

        <div class="flex justify-end gap-3">
            <button
                class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                onclick={() => (gradingOpen = false)}
            >
                {m.cancel()}
            </button>
            <button
                class="flex items-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                onclick={saveGrade}
                disabled={gradingSaving}
            >
                {#if gradingSaving}
                    <LoaderCircle size={14} class="animate-spin" />
                {/if}
                {m.mentor_submissions_save_grade()}
            </button>
        </div>
    </div>
</PopupModal>

{#snippet renderSubmissionCell(item: SubmissionRow, key: string)}
    {#if key === "state"}
        <span
            class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusColor(
                item.state,
            )}"
        >
            {statusLabel(item.state)}
        </span>
    {:else if key === "late"}
        {#if item.late}
            <span
                class="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
            >
                {m.mentor_submissions_late()}
            </span>
        {:else}
            <span class="text-gray-400">-</span>
        {/if}
    {:else}
        <span class="text-gray-600">{item[key] ?? ""}</span>
    {/if}
{/snippet}

{#snippet renderSubmissionActions(item: SubmissionRow)}
    <button
        class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
        onclick={() => openGradeModal(item)}
    >
        <PenLine size={14} />
        {m.mentor_submissions_grade()}
    </button>
{/snippet}
