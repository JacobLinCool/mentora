<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import type { ClassDoc } from "$lib/api";
    import {
        Button,
        Card,
        Input,
        Alert,
        Spinner,
        Modal,
        Label,
    } from "flowbite-svelte";
    import { BookOpen, Plus } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";

    let ownedClasses = $state<ClassDoc[]>([]);
    let enrolledClasses = $state<ClassDoc[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let joinCode = $state("");
    let joining = $state(false);
    let joinError = $state<string | null>(null);

    // Create class modal
    let showCreateModal = $state(false);
    let createTitle = $state("");
    let createCode = $state("");
    let creating = $state(false);
    let createError = $state<string | null>(null);

    async function loadClasses() {
        loading = true;
        error = null;

        const [ownedResult, enrolledResult] = await Promise.all([
            api.classes.listMine(),
            api.classes.listEnrolled(),
        ]);

        if (ownedResult.success) {
            ownedClasses = ownedResult.data;
        } else {
            error = ownedResult.error;
        }

        if (enrolledResult.success) {
            enrolledClasses = enrolledResult.data;
        } else if (!error) {
            error = enrolledResult.error;
        }

        loading = false;
    }

    async function handleJoinClass() {
        if (!joinCode.trim()) return;

        joining = true;
        joinError = null;

        const result = await api.classes.joinByCode(joinCode.trim());

        if (result.success) {
            joinCode = "";
            await loadClasses();
        } else {
            joinError = result.error;
        }

        joining = false;
    }

    async function handleCreateClass() {
        if (!createTitle.trim() || !createCode.trim()) return;

        creating = true;
        createError = null;

        const result = await api.classes.create(
            createTitle.trim(),
            createCode.trim(),
        );

        if (result.success) {
            createTitle = "";
            createCode = "";
            showCreateModal = false;
            await loadClasses();
            // Navigate to the new class
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            goto(`/classes/${result.data}`);
        } else {
            createError = result.error;
        }

        creating = false;
    }

    onMount(() => {
        loadClasses();
    });
</script>

<PageHead
    title={m.page_classes_title()}
    description={m.page_classes_description()}
/>

<div class="mx-auto max-w-6xl">
    <div class="mb-6 flex items-center justify-between">
        <h1 class="text-3xl font-bold">{m.classes_title()}</h1>
        <Button onclick={() => (showCreateModal = true)}>
            <Plus class="me-2 h-4 w-4" />
            {m.classes_create()}
        </Button>
    </div>

    <!-- Join by Code -->
    <Card class="mb-6 p-4">
        <h2 class="mb-4 text-xl font-semibold">{m.classes_join_by_code()}</h2>
        <div class="flex gap-2">
            <Input
                bind:value={joinCode}
                placeholder={m.classes_code_placeholder()}
                disabled={joining}
                class="flex-1"
            />
            <Button
                onclick={handleJoinClass}
                disabled={joining || !joinCode.trim()}
            >
                {#if joining}
                    <Spinner size="4" class="me-2" />
                {/if}
                {m.classes_join()}
            </Button>
        </div>
        {#if joinError}
            <Alert color="red" class="mt-2">{joinError}</Alert>
        {/if}
    </Card>

    {#if loading}
        <div class="py-12 text-center">
            <Spinner size="12" />
            <p class="mt-4 text-gray-600">{m.classes_loading()}</p>
        </div>
    {:else if error}
        <Alert color="red">{m.classes_error()}: {error}</Alert>
    {:else}
        <!-- Owned Classes -->
        <div class="mb-8">
            <h2 class="mb-4 text-2xl font-semibold">{m.classes_owned()}</h2>
            {#if ownedClasses.length === 0}
                <Card class="p-4">
                    <p class="py-4 text-center text-gray-600">
                        {m.classes_empty()}
                    </p>
                </Card>
            {:else}
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {#each ownedClasses as classDoc (classDoc.id)}
                        <Card class="p-4" href={`/classes/${classDoc.id}`}>
                            <div class="flex items-start gap-3">
                                <BookOpen
                                    class="h-6 w-6 flex-shrink-0 text-blue-600"
                                />
                                <div class="min-w-0 flex-1">
                                    <h3 class="truncate text-lg font-semibold">
                                        {classDoc.title}
                                    </h3>
                                    <p class="text-sm text-gray-600">
                                        {classDoc.code}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Enrolled Classes -->
        <div>
            <h2 class="mb-4 text-2xl font-semibold">{m.classes_enrolled()}</h2>
            {#if enrolledClasses.length === 0}
                <Card class="p-4">
                    <p class="py-4 text-center text-gray-600">
                        {m.classes_empty()}
                    </p>
                </Card>
            {:else}
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {#each enrolledClasses as classDoc (classDoc.id)}
                        <Card class="p-4" href={`/classes/${classDoc.id}`}>
                            <div class="flex items-start gap-3">
                                <BookOpen
                                    class="h-6 w-6 flex-shrink-0 text-green-600"
                                />
                                <div class="min-w-0 flex-1">
                                    <h3 class="truncate text-lg font-semibold">
                                        {classDoc.title}
                                    </h3>
                                    <p class="text-sm text-gray-600">
                                        {classDoc.code}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<!-- Create Class Modal -->
<Modal bind:open={showCreateModal} size="sm" dismissable={!creating}>
    <h3 class="mb-4 text-xl font-semibold">{m.classes_create()}</h3>

    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleCreateClass();
        }}
        class="space-y-4"
    >
        <div>
            <Label for="class-title" class="mb-2"
                >{m.classes_create_title()}</Label
            >
            <Input
                id="class-title"
                bind:value={createTitle}
                placeholder={m.classes_create_title()}
                disabled={creating}
                required
            />
        </div>

        <div>
            <Label for="class-code" class="mb-2"
                >{m.classes_create_code()}</Label
            >
            <Input
                id="class-code"
                bind:value={createCode}
                placeholder={m.classes_create_code()}
                disabled={creating}
                required
            />
        </div>

        {#if createError}
            <Alert color="red">{createError}</Alert>
        {/if}

        <div class="flex justify-end gap-2">
            <Button
                color="alternative"
                onclick={() => {
                    if (!creating) {
                        showCreateModal = false;
                        createError = null;
                    }
                }}
                disabled={creating}
            >
                {m.cancel()}
            </Button>
            <Button
                type="submit"
                disabled={creating || !createTitle.trim() || !createCode.trim()}
            >
                {#if creating}
                    <Spinner size="4" class="me-2" />
                {/if}
                {m.create()}
            </Button>
        </div>
    </form>
</Modal>
