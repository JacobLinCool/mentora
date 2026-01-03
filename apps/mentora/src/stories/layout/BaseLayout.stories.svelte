<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";

    const { Story } = defineMeta({
        title: "Layout/BaseLayout",
        component: BaseLayout,
    });
</script>

<Story name="Default">
    <BaseLayout>
        <div class="container mx-auto px-4 text-white">
            <h1 class="mb-4 font-serif text-4xl">Page Content</h1>
            <p class="text-text-secondary">
                This is wrapped in the base layout with navigation and
                background effects.
            </p>
            <div
                class="mt-8 flex h-64 items-center justify-center rounded-xl border border-dashed border-white/20"
            >
                Placeholder
            </div>
        </div>
    </BaseLayout>
</Story>
