<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import type { ClassDoc, Assignment, ClassMembership } from "$lib/api";
    import {
        Button,
        Card,
        Alert,
        Spinner,
        Badge,
        Table,
        TableHead,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHeadCell,
        Modal,
        Label,
        Input,
        Textarea,
    } from "flowbite-svelte";
    import {
        ArrowLeft,
        Users,
        ClipboardList,
        Plus,
        Copy,
        Check,
    } from "@lucide/svelte";

    const classId = $derived(page.params.id);

    let classDoc = $state<ClassDoc | null>(null);
    let assignments = $state<Assignment[]>([]);
    let roster = $state<ClassMembership[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    // Assignment creation
    let showCreateAssignment = $state(false);
    let assignmentTitle = $state("");
    let assignmentPrompt = $state("");
    let assignmentStartAt = $state("");
    let assignmentDueAt = $state("");
    let assignmentMode = $state<"instant">("instant");
    let creatingAssignment = $state(false);
    let createAssignmentError = $state<string | null>(null);

    // Code copy state
    let codeCopied = $state(false);

    async function loadClassDetails() {
        if (!classId) return;

        loading = true;
        error = null;

        const [classResult, assignmentsResult, rosterResult] =
            await Promise.all([
                api.classes.get(classId),
                api.assignments.listForClass(classId),
                api.classes.getRoster(classId),
            ]);

        if (classResult.success) {
            classDoc = classResult.data;
        } else {
            error = classResult.error;
        }

        if (assignmentsResult.success) {
            assignments = assignmentsResult.data;
        }

        if (rosterResult.success) {
            roster = rosterResult.data;
        }

        loading = false;
    }

    async function handleCreateAssignment() {
        if (
            !classId ||
            !assignmentTitle.trim() ||
            !assignmentPrompt.trim() ||
            !assignmentStartAt ||
            !assignmentDueAt
        )
            return;

        creatingAssignment = true;
        createAssignmentError = null;

        const result = await api.assignments.create({
            classId,
            title: assignmentTitle.trim(),
            prompt: assignmentPrompt.trim(),
            startAt: new Date(assignmentStartAt).getTime(),
            dueAt: new Date(assignmentDueAt).getTime(),
            mode: assignmentMode,
            allowLate: false,
            allowResubmit: false,
        });

        if (result.success) {
            assignmentTitle = "";
            assignmentPrompt = "";
            assignmentStartAt = "";
            assignmentDueAt = "";
            assignmentMode = "instant";
            showCreateAssignment = false;
            await loadClassDetails();
        } else {
            createAssignmentError = result.error;
        }

        creatingAssignment = false;
    }

    async function copyClassCode() {
        if (!classDoc?.code) return;
        await navigator.clipboard.writeText(classDoc.code);
        codeCopied = true;
        setTimeout(() => (codeCopied = false), 2000);
    }

    onMount(() => {
        loadClassDetails();
    });

    function formatDate(timestamp: number) {
        return new Date(timestamp).toLocaleDateString();
    }
</script>

<div class="mx-auto max-w-6xl">
    <Button href="/classes" color="light" class="mb-4">
        <ArrowLeft class="me-2 h-4 w-4" />
        {m.back()}
    </Button>

    {#if loading}
        <div class="py-12 text-center">
            <Spinner size="12" />
            <p class="mt-4 text-gray-600">{m.class_detail_loading()}</p>
        </div>
    {:else if error}
        <Alert color="red">{m.class_detail_error()}: {error}</Alert>
    {:else if classDoc}
        <!-- Class Header -->
        <Card class="mb-6 p-4">
            <h1 class="mb-2 text-3xl font-bold">{classDoc.title}</h1>
            <div class="flex gap-4 text-sm text-gray-600">
                <div>
                    <span class="font-semibold">{m.class_detail_code()}:</span>
                    <Badge color="blue" class="ms-2">{classDoc.code}</Badge>
                </div>
                <div>
                    <Users class="me-1 inline h-4 w-4" />
                    {m.class_detail_members({ count: roster.length })}
                </div>
            </div>
        </Card>

        <!-- Invite Members Section -->
        {#if api.currentUser && classDoc.ownerId === api.currentUser.uid}
            <Card class="mb-6 p-4">
                <h2 class="mb-3 text-xl font-semibold">
                    {m.class_detail_invite()}
                </h2>
                <p class="mb-2 text-sm text-gray-600">
                    {m.class_detail_share_code()}
                </p>
                <div class="flex items-center gap-2">
                    <code
                        class="flex-1 rounded bg-gray-100 px-3 py-2 font-mono text-lg"
                    >
                        {classDoc.code}
                    </code>
                    <Button onclick={copyClassCode} color="light" size="sm">
                        {#if codeCopied}
                            <Check class="h-4 w-4" />
                        {:else}
                            <Copy class="h-4 w-4" />
                        {/if}
                    </Button>
                </div>
            </Card>
        {/if}

        <!-- Assignments Section -->
        <Card class="mb-6 p-4">
            <div class="mb-4 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <ClipboardList class="h-6 w-6 text-blue-600" />
                    <h2 class="text-2xl font-semibold">
                        {m.class_detail_assignments()}
                    </h2>
                </div>
                {#if api.currentUser && classDoc.ownerId === api.currentUser.uid}
                    <Button
                        onclick={() => (showCreateAssignment = true)}
                        size="sm"
                    >
                        <Plus class="me-2 h-4 w-4" />
                        {m.class_detail_create_assignment()}
                    </Button>
                {/if}
            </div>
            {#if assignments.length === 0}
                <p class="py-4 text-center text-gray-600">
                    {m.class_detail_no_assignments()}
                </p>
            {:else}
                <div class="space-y-3">
                    {#each assignments as assignment (assignment.id)}
                        <Card
                            class="p-4"
                            href={`/assignments/${assignment.id}`}
                        >
                            <div class="flex items-start justify-between">
                                <div>
                                    <h3 class="text-lg font-semibold">
                                        {assignment.title}
                                    </h3>
                                    <p class="mt-1 text-sm text-gray-600">
                                        {m.assignments_due()}: {formatDate(
                                            assignment.dueAt ?? 0,
                                        )}
                                    </p>
                                </div>
                                <Badge
                                    color={assignment.startAt > Date.now()
                                        ? "yellow"
                                        : "green"}
                                >
                                    {assignment.mode}
                                </Badge>
                            </div>
                        </Card>
                    {/each}
                </div>
            {/if}
        </Card>

        <!-- Roster Section -->
        <Card class="p-4">
            <div class="mb-4 flex items-center gap-2">
                <Users class="h-6 w-6 text-green-600" />
                <h2 class="text-2xl font-semibold">
                    {m.class_detail_roster()}
                </h2>
            </div>
            {#if roster.length === 0}
                <p class="py-4 text-center text-gray-600">
                    {m.classes_empty()}
                </p>
            {:else}
                <Table>
                    <TableHead>
                        <TableHeadCell>Email</TableHeadCell>
                        <TableHeadCell>Role</TableHeadCell>
                        <TableHeadCell>Status</TableHeadCell>
                        <TableHeadCell>Joined</TableHeadCell>
                    </TableHead>
                    <TableBody>
                        {#each roster as member (member.email)}
                            <TableBodyRow>
                                <TableBodyCell>{member.email}</TableBodyCell>
                                <TableBodyCell>
                                    <Badge
                                        color={member.role === "instructor"
                                            ? "purple"
                                            : member.role === "ta"
                                              ? "blue"
                                              : "gray"}
                                    >
                                        {member.role}
                                    </Badge>
                                </TableBodyCell>
                                <TableBodyCell>
                                    <Badge
                                        color={member.status === "active"
                                            ? "green"
                                            : "yellow"}
                                    >
                                        {member.status}
                                    </Badge>
                                </TableBodyCell>
                                <TableBodyCell
                                    >{formatDate(
                                        member.joinedAt ?? 0,
                                    )}</TableBodyCell
                                >
                            </TableBodyRow>
                        {/each}
                    </TableBody>
                </Table>
            {/if}
        </Card>
    {/if}
</div>

<!-- Create Assignment Modal -->
<Modal
    bind:open={showCreateAssignment}
    size="md"
    dismissable={!creatingAssignment}
>
    <h3 class="mb-4 text-xl font-semibold">
        {m.class_detail_create_assignment()}
    </h3>

    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleCreateAssignment();
        }}
        class="space-y-4"
    >
        <div>
            <Label for="assignment-title" class="mb-2"
                >{m.assignment_create_title()}</Label
            >
            <Input
                id="assignment-title"
                bind:value={assignmentTitle}
                placeholder={m.assignment_create_title()}
                disabled={creatingAssignment}
                required
            />
        </div>

        <div>
            <Label for="assignment-prompt" class="mb-2"
                >{m.assignment_create_prompt()}</Label
            >
            <Textarea
                id="assignment-prompt"
                bind:value={assignmentPrompt}
                placeholder={m.assignment_create_prompt()}
                disabled={creatingAssignment}
                rows={4}
                required
            />
        </div>

        <div>
            <Label for="assignment-mode" class="mb-2"
                >{m.assignment_create_mode()}</Label
            >
            <Input id="assignment-mode" value="instant" disabled readonly />
            <p class="mt-1 text-sm text-gray-500">
                Currently only instant mode is supported
            </p>
        </div>

        <div>
            <Label for="assignment-start" class="mb-2"
                >{m.assignment_create_start_at()}</Label
            >
            <Input
                id="assignment-start"
                type="datetime-local"
                bind:value={assignmentStartAt}
                disabled={creatingAssignment}
                required
            />
        </div>

        <div>
            <Label for="assignment-due" class="mb-2"
                >{m.assignment_create_due_at()}</Label
            >
            <Input
                id="assignment-due"
                type="datetime-local"
                bind:value={assignmentDueAt}
                disabled={creatingAssignment}
                required
            />
        </div>

        {#if createAssignmentError}
            <Alert color="red">{createAssignmentError}</Alert>
        {/if}

        <div class="flex justify-end gap-2">
            <Button
                color="alternative"
                onclick={() => {
                    if (!creatingAssignment) {
                        showCreateAssignment = false;
                        createAssignmentError = null;
                    }
                }}
                disabled={creatingAssignment}
            >
                {m.cancel()}
            </Button>
            <Button
                type="submit"
                disabled={creatingAssignment ||
                    !assignmentTitle.trim() ||
                    !assignmentPrompt.trim() ||
                    !assignmentStartAt ||
                    !assignmentDueAt}
            >
                {#if creatingAssignment}
                    <Spinner size="4" class="me-2" />
                {/if}
                {m.create()}
            </Button>
        </div>
    </form>
</Modal>
