<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";

    const { Story } = defineMeta({
        title: "UI/CosmicButton",
        component: CosmicButton,
        argTypes: {
            variant: {
                control: { type: "select" },
                options: ["primary", "secondary", "danger", "ghost", "success"],
            },
            href: { control: "text" },
            className: { control: "text" },
        },
    });
</script>

<Story name="Primary">
    <CosmicButton variant="primary">Primary Action</CosmicButton>
</Story>

<Story name="Secondary">
    <CosmicButton variant="secondary">Secondary Action</CosmicButton>
</Story>

<Story name="Danger">
    <CosmicButton variant="danger">Danger Zone</CosmicButton>
</Story>

<Story name="Ghost">
    <CosmicButton variant="ghost">Ghost Button</CosmicButton>
</Story>

<Story name="Success">
    <CosmicButton variant="success">Success Action</CosmicButton>
</Story>

<Story name="Link">
    <CosmicButton variant="primary" href="/example">Link Button</CosmicButton>
</Story>

<Story name="All Variants">
    <div class="flex flex-wrap gap-4">
        <CosmicButton variant="primary">Primary</CosmicButton>
        <CosmicButton variant="secondary">Secondary</CosmicButton>
        <CosmicButton variant="danger">Danger</CosmicButton>
        <CosmicButton variant="ghost">Ghost</CosmicButton>
        <CosmicButton variant="success">Success</CosmicButton>
    </div>
</Story>
