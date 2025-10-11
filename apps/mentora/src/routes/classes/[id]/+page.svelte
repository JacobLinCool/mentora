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
    } from "flowbite-svelte";
    import { ArrowLeft, Users, ClipboardList } from "@lucide/svelte";

    const classId = $derived(page.params.id);

    let classDoc = $state<ClassDoc | null>(null);
    let assignments = $state<Assignment[]>([]);
    let roster = $state<ClassMembership[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

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

        <!-- Assignments Section -->
        <Card class="mb-6 p-4">
            <div class="mb-4 flex items-center gap-2">
                <ClipboardList class="h-6 w-6 text-blue-600" />
                <h2 class="text-2xl font-semibold">
                    {m.class_detail_assignments()}
                </h2>
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
