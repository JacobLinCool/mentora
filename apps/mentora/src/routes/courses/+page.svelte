<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import type { Course } from "$lib/api";
    import {
        A,
        Button,
        Card,
        Input,
        Alert,
        Spinner,
        Modal,
        Label,
    } from "flowbite-svelte";
    import { BookOpen, Plus } from "@lucide/svelte";

    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";

    let ownedCourses = $state<Course[]>([]);
    let enrolledCourses = $state<Course[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let joinCode = $state("");
    let joining = $state(false);
    let joinError = $state<string | null>(null);

    // Create course modal
    let showCreateModal = $state(false);
    let createTitle = $state("");
    let createCode = $state("");
    let creating = $state(false);
    let createError = $state<string | null>(null);

    async function loadCourses() {
        loading = true;
        error = null;

        const [ownedResult, enrolledResult] = await Promise.all([
            api.courses.listMine(),
            api.courses.listEnrolled(),
        ]);

        if (ownedResult.success) {
            ownedCourses = ownedResult.data;
        } else {
            error = ownedResult.error;
        }

        if (enrolledResult.success) {
            enrolledCourses = enrolledResult.data;
        } else if (!error) {
            error = enrolledResult.error;
        }

        loading = false;
    }

    async function handleJoinCourse() {
        if (!joinCode.trim()) return;

        joining = true;
        joinError = null;

        const result = await api.courses.joinByCode(joinCode.trim());

        if (result.success) {
            joinCode = "";
            await loadCourses();
        } else {
            joinError = result.error;
        }

        joining = false;
    }

    async function handleCreateCourse() {
        if (!createTitle.trim() || !createCode.trim()) return;

        creating = true;
        createError = null;

        const result = await api.courses.create(
            createTitle.trim(),
            createCode.trim(),
        );

        if (result.success) {
            createTitle = "";
            createCode = "";
            showCreateModal = false;
            await loadCourses();
            // Navigate to the new course

            goto(resolve(`/courses/${result.data}`));
        } else {
            createError = result.error;
        }

        creating = false;
    }

    onMount(() => {
        loadCourses();
    });
</script>

<BaseLayout>
    <div class="container mx-auto px-4 py-8">
        <div class="mb-6 flex items-center justify-between">
            <h1 class="text-3xl font-bold">{m.courses_title()}</h1>
            <Button onclick={() => (showCreateModal = true)}>
                <Plus class="me-2 h-4 w-4" />
                {m.courses_create()}
            </Button>
        </div>

        <!-- Join by Code -->
        <Card class="mb-6 p-4">
            <h2 class="mb-4 text-xl font-semibold">
                {m.courses_join_by_code()}
            </h2>
            <div class="flex gap-2">
                <Input
                    bind:value={joinCode}
                    placeholder={m.courses_code_placeholder()}
                    disabled={joining}
                    class="flex-1"
                />
                <Button
                    onclick={handleJoinCourse}
                    disabled={joining || !joinCode.trim()}
                >
                    {#if joining}
                        <Spinner size="4" class="me-2" />
                    {/if}
                    {m.courses_join()}
                </Button>
            </div>
            {#if joinError}
                <Alert color="red" class="mt-2">{joinError}</Alert>
            {/if}
        </Card>

        {#if loading}
            <div class="py-12 text-center">
                <Spinner size="12" />
                <p class="mt-4 text-gray-600">{m.courses_loading()}</p>
            </div>
        {:else if error}
            <Alert color="red">{m.courses_error()}: {error}</Alert>
        {:else}
            <!-- Owned Courses -->
            <div class="mb-8">
                <h2 class="mb-4 text-2xl font-semibold">{m.courses_owned()}</h2>
                {#if ownedCourses.length === 0}
                    <Card class="p-4">
                        <p class="py-4 text-center text-gray-600">
                            {m.courses_empty()}
                        </p>
                        <p class="mt-2 text-sm text-gray-500">
                            {m.courses_empty_owned_hint()}
                        </p>
                    </Card>
                {:else}
                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {#each ownedCourses as courseDoc (courseDoc.id)}
                            <Card class="p-4" href={`/courses/${courseDoc.id}`}>
                                <div class="flex items-start gap-3">
                                    <BookOpen
                                        class="h-6 w-6 shrink-0 text-blue-600"
                                    />
                                    <div class="min-w-0 flex-1">
                                        <h3
                                            class="truncate text-lg font-semibold"
                                        >
                                            {courseDoc.title}
                                        </h3>
                                        <p class="text-sm text-gray-600">
                                            {courseDoc.code}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Enrolled Courses -->
            <div>
                <h2 class="mb-4 text-2xl font-semibold">
                    {m.courses_enrolled()}
                </h2>
                {#if enrolledCourses.length === 0}
                    <Card class="p-4">
                        <p class="py-4 text-center text-gray-600">
                            {m.courses_empty()}
                        </p>
                        <p class="mt-2 text-sm text-gray-500">
                            {m.courses_empty_enrolled_hint()}
                        </p>
                        <A href={resolve("/explore")} class="mt-3 inline-block">
                            {m.courses_empty_enrolled_cta()}
                        </A>
                    </Card>
                {:else}
                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {#each enrolledCourses as courseDoc (courseDoc.id)}
                            <Card class="p-4" href={`/courses/${courseDoc.id}`}>
                                <div class="flex items-start gap-3">
                                    <BookOpen
                                        class="h-6 w-6 shrink-0 text-green-600"
                                    />
                                    <div class="min-w-0 flex-1">
                                        <h3
                                            class="truncate text-lg font-semibold"
                                        >
                                            {courseDoc.title}
                                        </h3>
                                        <p class="text-sm text-gray-600">
                                            {courseDoc.code}
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
</BaseLayout>

<!-- Create Course Modal -->
<Modal bind:open={showCreateModal} size="sm" dismissable={!creating}>
    <h3 class="mb-4 text-xl font-semibold">{m.courses_create()}</h3>

    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleCreateCourse();
        }}
        class="space-y-4"
    >
        <div>
            <Label for="course-title" class="mb-2"
                >{m.courses_create_title()}</Label
            >
            <Input
                id="course-title"
                bind:value={createTitle}
                placeholder={m.courses_create_title()}
                disabled={creating}
                required
            />
        </div>

        <div>
            <Label for="course-code" class="mb-2"
                >{m.courses_create_code()}</Label
            >
            <Input
                id="course-code"
                bind:value={createCode}
                placeholder={m.courses_create_code()}
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
