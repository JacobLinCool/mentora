<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import { Button, TextPlaceholder } from "flowbite-svelte";
    import { House, BookOpen, ClipboardList, LogIn } from "@lucide/svelte";

    let { children } = $props();

    const currentUser = $derived(api.currentUser);
    const authReady = $derived(api.authReady);
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-full w-full flex-col">
    <!-- Navigation Header -->
    <header class="border-b border-gray-200 bg-white">
        <nav
            class="container mx-auto flex w-full items-center justify-between px-4 py-3"
        >
            <div class="flex flex-1 items-center gap-4">
                <a href="/" class="text-xl font-bold text-blue-600">Mentora</a>
                {#if currentUser}
                    <div class="flex gap-2 overflow-auto">
                        <Button href="/classes" size="sm" color="light">
                            <BookOpen class="h-4 w-4" />
                            <span class="ms-2 max-sm:hidden">
                                {m.nav_classes()}
                            </span>
                        </Button>
                        <Button href="/assignments" size="sm" color="light">
                            <ClipboardList class="h-4 w-4" />
                            <span class="ms-2 max-sm:hidden">
                                {m.nav_assignments()}
                            </span>
                        </Button>
                    </div>
                {/if}
            </div>
            <div>
                {#if currentUser}
                    <Button href="/auth" size="sm" color="light">
                        {currentUser.displayName || currentUser.email}
                    </Button>
                {:else}
                    <Button href="/auth" size="sm">
                        <LogIn class="me-2 h-4 w-4" />
                        {m.nav_sign_in()}
                    </Button>
                {/if}
            </div>
        </nav>
    </header>

    <!-- Main Content -->
    {#await authReady}
        <div class="flex flex-1 items-center justify-center">
            <TextPlaceholder size="lg" class="h-8 w-48" />
        </div>
    {:then}
        <main class="container mx-auto flex-1 overflow-auto px-4 py-8">
            {@render children?.()}
        </main>
    {/await}
</div>
