<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import type { Assignment, Submission, Conversation } from "$lib/api";
    import { Spinner } from "flowbite-svelte";
    import {
        ArrowLeft,
        Calendar,
        Clock,
        CirclePlay,
        MessageSquare,
        CheckCircle2,
        GraduationCap,
    } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
    import StatusBadge from "$lib/components/ui/StatusBadge.svelte";

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
                goto(resolve(`/conversations/${conversationResult.data.id}`));
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
            goto(resolve(`/conversations/${conversation.id}`));
        }
    }

    onMount(() => {
        loadAssignmentDetails();
    });

    function formatDateTime(timestamp: number) {
        return new Date(timestamp).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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

    function getSubmissionStatus(
        sub: Submission | null,
    ): "success" | "warning" | "active" | "error" {
        if (!sub) return "active";
        switch (sub.state) {
            case "in_progress":
                return "warning";
            case "submitted":
                return "success";
            case "graded_complete":
                return "success";
            default:
                return "active";
        }
    }
</script>

<PageHead
    title={pageTitle}
    description={m.page_assignment_detail_description()}
/>

<BaseLayout>
    <div class="container mx-auto max-w-4xl px-4 py-8">
        <div class="mb-8">
            <CosmicButton
                href="/assignments"
                variant="secondary"
                className="!py-2 !px-3 mb-6"
            >
                <ArrowLeft class="me-2 h-4 w-4" />
                {m.back()}
            </CosmicButton>

            {#if loading}
                <div class="py-24 text-center">
                    <Spinner size="12" color="gray" />
                    <p class="mt-4 animate-pulse text-white/50">
                        {m.assignment_detail_loading()}
                    </p>
                </div>
            {:else if error}
                <GlassCard
                    className="border-status-error/50 bg-status-error/10"
                >
                    <p class="text-status-error font-bold">
                        {m.assignment_detail_error()}: {error}
                    </p>
                </GlassCard>
            {:else if assignment}
                <!-- Header -->
                <GlassCard className="mb-8 relative overflow-hidden">
                    <div
                        class="bg-brand-gold/5 pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                    ></div>

                    <div
                        class="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-start"
                    >
                        <div>
                            <span
                                class="text-text-secondary mb-3 inline-block rounded border border-white/10 px-2 py-1 font-mono text-xs"
                            >
                                {assignment.mode.toUpperCase()}
                            </span>
                            <h1
                                class="mb-4 font-serif text-4xl leading-tight text-white"
                            >
                                {assignment.title}
                            </h1>

                            <div
                                class="text-text-secondary flex flex-wrap gap-6 text-sm"
                            >
                                <div class="flex items-center gap-2">
                                    <Calendar class="text-brand-gold h-4 w-4" />
                                    <span class="font-medium"
                                        >{m.assignment_detail_start_at()}:</span
                                    >
                                    <span class="text-white/80"
                                        >{formatDateTime(
                                            assignment.startAt,
                                        )}</span
                                    >
                                </div>
                                <div class="flex items-center gap-2">
                                    <Clock class="text-brand-gold h-4 w-4" />
                                    <span class="font-medium"
                                        >{m.assignment_detail_due_at()}:</span
                                    >
                                    <span class="text-white/80"
                                        >{formatDateTime(
                                            assignment.dueAt ?? 0,
                                        )}</span
                                    >
                                </div>
                            </div>
                        </div>

                        <!-- Status Card (Mobile optimized, usually top right on desktop) -->
                        <div class="flex flex-col items-end gap-2">
                            {#if submission}
                                <StatusBadge
                                    status={getSubmissionStatus(submission)}
                                    className="!text-sm !px-3 !py-1"
                                >
                                    {submission.state
                                        .replace("_", " ")
                                        .toUpperCase()}
                                </StatusBadge>
                                {#if submission.submittedAt}
                                    <span
                                        class="text-text-secondary text-right text-xs"
                                    >
                                        Submitted: {formatDateTime(
                                            submission.submittedAt,
                                        )}
                                    </span>
                                {/if}
                            {:else}
                                <StatusBadge status="active"
                                    >NOT STARTED</StatusBadge
                                >
                            {/if}
                        </div>
                    </div>

                    <div class="mt-6 flex flex-wrap gap-2">
                        {#if assignment.allowLate}
                            <span
                                class="rounded border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500"
                                >Late submissions allowed</span
                            >
                        {/if}
                        {#if assignment.allowResubmit}
                            <span
                                class="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-500"
                                >Resubmission allowed</span
                            >
                        {/if}
                    </div>
                </GlassCard>

                <div class="grid gap-6 md:grid-cols-3">
                    <!-- Main Content (Prompt) -->
                    <div class="md:col-span-2">
                        <GlassCard className="h-full">
                            <h2
                                class="mb-4 flex items-center gap-2 font-serif text-xl text-white"
                            >
                                <GraduationCap
                                    class="text-brand-gold h-5 w-5"
                                />
                                {m.assignment_detail_prompt()}
                            </h2>
                            <div
                                class="prose prose-invert max-w-none leading-relaxed font-light whitespace-pre-wrap text-white/80"
                            >
                                {assignment.prompt}
                            </div>
                        </GlassCard>
                    </div>

                    <!-- Sidebar (Actions) -->
                    <div class="md:col-span-1">
                        <GlassCard className="sticky top-24">
                            {#if actionError}
                                <div
                                    class="bg-status-error/10 border-status-error/30 text-status-error mb-4 rounded border p-3 text-sm"
                                >
                                    {actionError}
                                </div>
                            {/if}

                            <div class="flex flex-col gap-3">
                                {#if !isStarted()}
                                    <CosmicButton
                                        onclick={handleStartAssignment}
                                        disabled={actionLoading || !canStart()}
                                        variant="primary"
                                        className="w-full justify-center !py-3 !text-lg"
                                    >
                                        {#if actionLoading}
                                            <Spinner size="4" class="me-2" />
                                        {:else}
                                            <CirclePlay class="me-2 h-5 w-5" />
                                        {/if}
                                        {m.assignment_detail_start()}
                                    </CosmicButton>
                                    {#if !canStart()}
                                        <p
                                            class="text-text-secondary mt-2 text-center text-xs"
                                        >
                                            Opens on {formatDateTime(
                                                assignment.startAt,
                                            )}
                                        </p>
                                    {/if}
                                {:else if isSubmitted()}
                                    <div class="py-4 text-center">
                                        <CheckCircle2
                                            class="text-status-success mx-auto mb-2 h-12 w-12"
                                        />
                                        <p class="mb-4 font-medium text-white">
                                            {m.assignment_detail_submitted()}
                                        </p>

                                        {#if conversation}
                                            <CosmicButton
                                                onclick={handleContinue}
                                                variant="secondary"
                                                className="w-full justify-center"
                                            >
                                                <MessageSquare
                                                    class="me-2 h-4 w-4"
                                                />
                                                View Thread
                                            </CosmicButton>
                                        {/if}
                                    </div>
                                {:else}
                                    <!-- In Progress -->
                                    <CosmicButton
                                        onclick={handleContinue}
                                        variant="primary"
                                        className="w-full justify-center mb-2"
                                    >
                                        <MessageSquare class="me-2 h-5 w-5" />
                                        {m.assignment_detail_continue()}
                                    </CosmicButton>

                                    <CosmicButton
                                        onclick={handleSubmit}
                                        disabled={actionLoading}
                                        variant="success"
                                        className="w-full justify-center"
                                    >
                                        {#if actionLoading}
                                            <Spinner size="4" class="me-2" />
                                        {:else}
                                            <CheckCircle2
                                                class="me-2 h-4 w-4"
                                            />
                                        {/if}
                                        {m.assignment_detail_submit()}
                                    </CosmicButton>
                                {/if}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</BaseLayout>
