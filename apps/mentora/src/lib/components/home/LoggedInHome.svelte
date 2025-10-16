<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { Button, Card } from "flowbite-svelte";
    import { BookOpen, ClipboardList } from "@lucide/svelte";
</script>

<div class="mx-auto max-w-4xl">
    <div class="mb-12 text-center">
        <h1 class="mb-4 text-4xl font-bold text-gray-900">{m.home_title()}</h1>
        <p class="text-xl text-gray-600">{m.home_subtitle()}</p>
    </div>

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
</div>
