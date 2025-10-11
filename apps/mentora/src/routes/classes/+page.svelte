<script lang="ts">
    import { onMount } from "svelte";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import type { ClassDoc } from "$lib/api";
    import { Button, Card, Input, Alert, Spinner } from "flowbite-svelte";
    import { BookOpen } from "@lucide/svelte";

    let ownedClasses = $state<ClassDoc[]>([]);
    let enrolledClasses = $state<ClassDoc[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let joinCode = $state("");
    let joining = $state(false);
    let joinError = $state<string | null>(null);

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

    onMount(() => {
        loadClasses();
    });
</script>

<div class="mx-auto max-w-6xl">
    <div class="mb-6 flex items-center justify-between">
        <h1 class="text-3xl font-bold">{m.classes_title()}</h1>
    </div>

    <!-- Join by Code -->
    <Card class="mb-6  p-4">
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
