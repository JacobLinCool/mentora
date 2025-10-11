<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import { Button } from "flowbite-svelte";
    import { House, BookOpen, ClipboardList, LogIn } from "@lucide/svelte";

    let { children } = $props();

    const currentUser = $derived(api.currentUser);
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col">
    <!-- Navigation Header -->
    <header class="border-b border-gray-200 bg-white">
        <nav
            class="container mx-auto flex items-center justify-between px-4 py-3"
        >
            <div class="flex items-center gap-4">
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                <a href="/" class="text-xl font-bold text-blue-600">Mentora</a>
                {#if currentUser}
                    <div class="flex gap-2">
                        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                        <Button href="/" size="sm" color="light">
                            <House class="me-2 h-4 w-4" />
                            {m.nav_home()}
                        </Button>
                        <Button href="/classes" size="sm" color="light">
                            <BookOpen class="me-2 h-4 w-4" />
                            {m.nav_classes()}
                        </Button>
                        <Button href="/assignments" size="sm" color="light">
                            <ClipboardList class="me-2 h-4 w-4" />
                            {m.nav_assignments()}
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
    <main class="container mx-auto flex-1 px-4 py-8">
        {@render children?.()}
    </main>
</div>
