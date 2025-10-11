<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { api } from "$lib";
    import { Button, Card } from "flowbite-svelte";
    import { BookOpen, ClipboardList } from "@lucide/svelte";

    const currentUser = $derived(api.currentUser);
</script>

<div class="mx-auto max-w-4xl">
    <div class="mb-12 text-center">
        <h1 class="mb-4 text-4xl font-bold text-gray-900">{m.home_title()}</h1>
        <p class="text-xl text-gray-600">{m.home_subtitle()}</p>
    </div>

    {#if currentUser}
        <div class="grid gap-6 md:grid-cols-2">
            <Card class="p-4 text-center">
                <BookOpen class="mx-auto mb-4 h-16 w-16 text-blue-600" />
                <h2 class="mb-4 text-2xl font-semibold">
                    {m.home_my_classes()}
                </h2>
                <Button href="/classes" color="blue">
                    {m.classes_view()}
                </Button>
            </Card>

            <Card class="p-4 text-center">
                <ClipboardList class="mx-auto mb-4 h-16 w-16 text-green-600" />
                <h2 class="mb-4 text-2xl font-semibold">
                    {m.home_my_assignments()}
                </h2>
                <Button href="/assignments" color="green">
                    {m.assignments_view()}
                </Button>
            </Card>
        </div>
    {:else}
        <Card class="p-4  text-center">
            <p class="mb-4 text-lg text-gray-700">{m.home_sign_in_prompt()}</p>
            <Button href="/auth" size="lg">
                {m.nav_sign_in()}
            </Button>
        </Card>
    {/if}
</div>
