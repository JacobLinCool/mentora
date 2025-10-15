<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import type { Assignment, Submission, Conversation } from "$lib/api";
    import { Button, Card, Alert, Spinner, Badge } from "flowbite-svelte";
    import {
        ArrowLeft,
        Calendar,
        Clock,
        CirclePlay,
        MessageSquare,
    } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";

    const assignmentId = $derived(page.params.id);

    let assignment = $state<Assignment | null>(null);
    let submission = $state<Submission | null>(null);
    let conversation = $state<Conversation | null>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let actionLoading = $state(false);
    let actionError = $state<string | null>(null);

    async function loadAssignmentDetails() {
        if (!assignmentId) return;

        loading = true;
        error = null;

        const assignmentResult = await api.assignments.get(assignmentId);
        if (!assignmentResult.success) {
            error = assignmentResult.error;
            loading = false;
            return;
        }

        assignment = assignmentResult.data;

        // Try to get submission
        const submissionResult = await api.submissions.getMine(assignmentId);
        if (submissionResult.success) {
            submission = submissionResult.data;

            // If there's a submission, try to get the conversation
            const conversationResult =
                await api.conversations.getForAssignment(assignmentId);
            if (conversationResult.success) {
                conversation = conversationResult.data;
            }
        }

        loading = false;
    }

    async function handleStartAssignment() {
        if (!assignmentId) return;

        actionLoading = true;
        actionError = null;

        const result = await api.submissions.start(assignmentId);

        if (result.success) {
            // Reload to get the submission
            await loadAssignmentDetails();

            // Try to get conversation and redirect
            const conversationResult =
                await api.conversations.getForAssignment(assignmentId);
            if (conversationResult.success && conversationResult.data.id) {
                // eslint-disable-next-line svelte/no-navigation-without-resolve
                goto(`/conversations/${conversationResult.data.id}`);
            }
        } else {
            actionError = result.error;
        }

        actionLoading = false;
    }

    async function handleSubmit() {
        if (!assignmentId) return;

        actionLoading = true;
        actionError = null;

        const result = await api.submissions.submit(assignmentId);

        if (result.success) {
            await loadAssignmentDetails();
        } else {
            actionError = result.error;
        }

        actionLoading = false;
    }

    function handleContinue() {
        if (conversation?.id) {
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            goto(`/conversations/${conversation.id}`);
        }
    }

    onMount(() => {
        loadAssignmentDetails();
    });

    function formatDateTime(timestamp: number) {
        return new Date(timestamp).toLocaleString();
    }

    function isStarted() {
        return submission !== null;
    }

    const pageTitle = $derived(
        assignment?.title ?? m.page_assignment_detail_title(),
    );

    function isSubmitted() {
        return (
            submission?.state === "submitted" ||
            submission?.state === "graded_complete"
        );
    }

    function canStart() {
        return assignment && assignment.startAt <= Date.now();
    }
</script>

<PageHead
    title={pageTitle}
    description={m.page_assignment_detail_description()}
/>

<div class="mx-auto max-w-4xl">
    <Button href="/assignments" color="light" class="mb-4">
        <ArrowLeft class="me-2 h-4 w-4" />
        {m.back()}
    </Button>

    {#if loading}
        <div class="py-12 text-center">
            <Spinner size="12" />
            <p class="mt-4 text-gray-600">{m.assignment_detail_loading()}</p>
        </div>
    {:else if error}
        <Alert color="red">{m.assignment_detail_error()}: {error}</Alert>
    {:else if assignment}
        <!-- Assignment Header -->
        <Card class="mb-6  p-4">
            <h1 class="mb-4 text-3xl font-bold">{assignment.title}</h1>

            <div class="mb-4 grid gap-4 md:grid-cols-2">
                <div class="flex items-center gap-2 text-sm">
                    <Calendar class="h-4 w-4 text-gray-600" />
                    <span class="font-semibold"
                        >{m.assignment_detail_start_at()}:</span
                    >
                    <span>{formatDateTime(assignment.startAt)}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                    <Clock class="h-4 w-4 text-gray-600" />
                    <span class="font-semibold"
                        >{m.assignment_detail_due_at()}:</span
                    >
                    <span>{formatDateTime(assignment.dueAt ?? 0)}</span>
                </div>
            </div>

            <div class="mb-4 flex gap-2">
                <Badge color="gray"
                    >{m.assignment_detail_mode()}: {assignment.mode}</Badge
                >
                {#if assignment.allowLate}
                    <Badge color="yellow">Late submissions allowed</Badge>
                {/if}
                {#if assignment.allowResubmit}
                    <Badge color="blue">Resubmission allowed</Badge>
                {/if}
            </div>

            {#if submission}
                <div class="border-t pt-4">
                    <h3 class="mb-2 font-semibold">Submission Status</h3>
                    <div class="flex items-center gap-2">
                        <Badge color={isSubmitted() ? "green" : "yellow"}>
                            {submission.state}
                        </Badge>
                        {#if submission.submittedAt}
                            <span class="text-sm text-gray-600">
                                Submitted: {formatDateTime(
                                    submission.submittedAt,
                                )}
                            </span>
                        {/if}
                        {#if submission.late}
                            <Badge color="red">Late</Badge>
                        {/if}
                    </div>
                </div>
            {/if}
        </Card>

        <!-- Prompt -->
        <Card class="mb-6  p-4">
            <h2 class="mb-3 text-xl font-semibold">
                {m.assignment_detail_prompt()}
            </h2>
            <div class="prose max-w-none">
                <p class="whitespace-pre-wrap">{assignment.prompt}</p>
            </div>
        </Card>

        <!-- Actions -->
        <Card>
            {#if actionError}
                <Alert color="red" class="mb-4">{actionError}</Alert>
            {/if}

            <div class="flex justify-center gap-3">
                {#if !isStarted()}
                    <Button
                        onclick={handleStartAssignment}
                        disabled={actionLoading || !canStart()}
                        size="lg"
                        color="blue"
                    >
                        {#if actionLoading}
                            <Spinner size="4" class="me-2" />
                        {:else}
                            <CirclePlay class="me-2 h-5 w-5" />
                        {/if}
                        {m.assignment_detail_start()}
                    </Button>
                    {#if !canStart()}
                        <p class="self-center text-sm text-gray-600">
                            Assignment starts {formatDateTime(
                                assignment.startAt,
                            )}
                        </p>
                    {/if}
                {:else if isSubmitted()}
                    <div class="text-center">
                        <Badge color="green" class="px-4 py-2 text-lg">
                            {m.assignment_detail_submitted()}
                        </Badge>
                        {#if conversation}
                            <Button
                                onclick={handleContinue}
                                color="light"
                                class="mt-4"
                            >
                                <MessageSquare class="me-2 h-4 w-4" />
                                {m.assignment_detail_view_submission()}
                            </Button>
                        {/if}
                    </div>
                {:else}
                    <!-- In Progress -->
                    <Button onclick={handleContinue} size="lg" color="blue">
                        <MessageSquare class="me-2 h-5 w-5" />
                        {m.assignment_detail_continue()}
                    </Button>
                    <Button
                        onclick={handleSubmit}
                        disabled={actionLoading}
                        size="lg"
                        color="green"
                    >
                        {#if actionLoading}
                            <Spinner size="4" class="me-2" />
                        {/if}
                        {m.assignment_detail_submit()}
                    </Button>
                {/if}
            </div>
        </Card>
    {/if}
</div>
