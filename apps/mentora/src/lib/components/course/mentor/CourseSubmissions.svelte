<script lang="ts">
    import { LoaderCircle, Eye, PenLine } from "@lucide/svelte";
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
        responseCount: number;
        [key: string]: unknown;
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

    // Response viewer modal state
    let viewResponseOpen = $state(false);
    let viewResponseStudentName = $state("");
    let viewResponseLoading = $state(false);
    let viewResponseQuestionnaire = $state<Questionnaire | null>(null);
    let viewResponseData = $state<QuestionnaireResponse | null>(null);

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
        const res =
            await api.questionnaireResponses.listForQuestionnaire(
                questionnaireId,
            );
        if (!res.success) {
            error = res.error;
            return;
        }

        const userIds = [
            ...new Set(res.data.map((r: QuestionnaireResponse) => r.userId)),
        ];
        await Promise.all(userIds.map(resolveUserName));

        responseRows = res.data.map(
            (r: QuestionnaireResponse, idx: number) => ({
                id: `${r.userId}-${idx}`,
                userId: r.userId,
                student:
                    userNameCache.get(r.userId) || r.userId.substring(0, 8),
                submittedAt: formatMentoraDateTime(r.submittedAt),
                responseCount: r.responses.length,
            }),
        );
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

    // --- Response Viewer ---
    async function openResponseViewer(row: ResponseRow) {
        viewResponseStudentName = row.student;
        viewResponseLoading = true;
        viewResponseQuestionnaire = null;
        viewResponseData = null;
        viewResponseOpen = true;

        try {
            const [qRes, rRes] = await Promise.all([
                api.questionnaires.get(selectedItemId),
                api.questionnaireResponses.get(selectedItemId, row.userId),
            ]);

            if (qRes.success) {
                viewResponseQuestionnaire = qRes.data;
            }
            if (rRes.success) {
                viewResponseData = rRes.data;
            }
        } catch {
            // Error handled by null checks in the template
        } finally {
            viewResponseLoading = false;
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
            class="w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
        >
            <option value="">{m.mentor_submissions_select()}</option>
            {#each items as item (item.id)}
                <option value={item.id}>
                    [{item.type === "dialogue"
                        ? m.mentor_submissions_type_dialogue()
                        : m.mentor_submissions_type_questionnaire()}] {item.title}
                </option>
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
            {#if responseRows.length === 0}
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
                                key: "submittedAt",
                                label: m.mentor_submissions_submitted_at(),
                                sortable: true,
                            },
                            {
                                key: "responseCount",
                                label: m.mentor_submissions_response_count(),
                                sortable: true,
                            },
                        ]}
                        data={responseRows}
                        actions={renderResponseActions}
                    />
                </div>
            {/if}
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

<!-- Response Viewer Modal -->
<PopupModal
    bind:open={viewResponseOpen}
    title={m.mentor_submissions_view_response()}
    size="lg"
>
    <div class="space-y-4">
        <div class="text-sm font-medium text-gray-700">
            {m.mentor_submissions_student()}: {viewResponseStudentName}
        </div>

        {#if viewResponseLoading}
            <div class="flex items-center justify-center p-4 text-gray-500">
                <LoaderCircle size={20} class="mr-2 animate-spin" />
                {m.loading()}
            </div>
        {:else if viewResponseQuestionnaire && viewResponseData}
            <div class="space-y-4">
                {#each viewResponseData.responses as resp, idx (idx)}
                    {@const questionDef =
                        viewResponseQuestionnaire.questions[resp.questionIndex]}
                    <div
                        class="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                        <div class="mb-2 text-sm font-medium text-gray-800">
                            Q{resp.questionIndex + 1}.
                            {questionDef?.question.questionText ?? ""}
                        </div>
                        <div class="text-sm text-gray-600">
                            {formatAnswer(resp.answer, questionDef)}
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="text-sm text-gray-500">
                {m.mentor_submissions_no_results()}
            </div>
        {/if}

        <div class="flex justify-end">
            <button
                class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                onclick={() => (viewResponseOpen = false)}
            >
                {m.done()}
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

{#snippet renderResponseActions(item: ResponseRow)}
    <button
        class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
        onclick={() => openResponseViewer(item)}
    >
        <Eye size={14} />
        {m.mentor_submissions_view()}
    </button>
{/snippet}
