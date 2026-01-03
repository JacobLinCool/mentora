<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import StatusBadge from "$lib/components/ui/StatusBadge.svelte";

    const { Story } = defineMeta({
        title: "UI/StatusBadge",
        component: StatusBadge,
        argTypes: {
            status: {
                control: { type: "select" },
                options: ["active", "success", "warning", "error", "revoked"],
            },
        },
    });
</script>

<Story name="Active">
    <StatusBadge status="active">Active</StatusBadge>
</Story>

<Story name="Success">
    <StatusBadge status="success">Completed</StatusBadge>
</Story>

<Story name="Warning">
    <StatusBadge status="warning">Pending</StatusBadge>
</Story>

<Story name="Error">
    <StatusBadge status="error">Failed</StatusBadge>
</Story>

<Story name="Revoked">
    <StatusBadge status="revoked">Revoked</StatusBadge>
</Story>

<Story name="All Statuses">
    <div class="flex flex-wrap gap-4">
        <StatusBadge status="active">Active</StatusBadge>
        <StatusBadge status="success">Success</StatusBadge>
        <StatusBadge status="warning">Warning</StatusBadge>
        <StatusBadge status="error">Error</StatusBadge>
        <StatusBadge status="revoked">Revoked</StatusBadge>
    </div>
</Story>
