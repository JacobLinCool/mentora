<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { api } from "$lib";
    import { m } from "$lib/paraglide/messages";
    import { Alert, Spinner } from "flowbite-svelte";

    const joinCode = $derived((page.params.code || "").trim().toUpperCase());
    let errorMessage = $state<string | null>(null);
    let loading = $state(true);

    onMount(async () => {
        await api.authReady;

        if (!joinCode) {
            loading = false;
            errorMessage = m.join_invalid_link();
            return;
        }

        if (!api.isAuthenticated) {
            const next = `/join/${joinCode}`;
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            await goto(`${resolve("/auth")}?next=${encodeURIComponent(next)}`, {
                replaceState: true,
            });
            return;
        }

        const result = await api.courses.joinByCode(joinCode);

        if (result.success) {
            await goto(resolve(`/courses/${result.data.courseId}`), {
                replaceState: true,
            });
            return;
        }

        loading = false;
        errorMessage = result.error ?? m.join_failed();
    });
</script>

<svelte:head>
    <title>Join Course | Mentora</title>
</svelte:head>

<div
    class="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4"
>
    {#if loading}
        <div class="text-center">
            <Spinner size="8" />
            <p class="mt-4 text-sm text-gray-600">{m.join_joining()}</p>
        </div>
    {:else}
        <div class="w-full space-y-4">
            <Alert color="red">{errorMessage}</Alert>
            <a
                href={resolve("/")}
                class="block text-center text-blue-600 underline"
            >
                {m.join_back_home()}
            </a>
        </div>
    {/if}
</div>
