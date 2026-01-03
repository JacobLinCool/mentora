<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import DataGrid from "$lib/components/ui/DataGrid.svelte";
    import StatusBadge from "$lib/components/ui/StatusBadge.svelte";

    const { Story } = defineMeta({
        title: "UI/DataGrid",
        component: DataGrid,
        argTypes: {
            headers: { control: "object" },
            className: { control: "text" },
        },
    });

    const rows = [
        { name: "Alice", role: "Admin", status: "active" },
        { name: "Bob", role: "User", status: "warning" },
        { name: "Charlie", role: "Guest", status: "error" },
    ] as const;
</script>

<Story name="Default">
    <div class="bg-canvas-deep p-4">
        <DataGrid headers={["Name", "Role", "Status"]}>
            {#each rows as row (row.name)}
                <tr>
                    <td class="px-4 py-4 text-white">{row.name}</td>
                    <td class="text-text-secondary px-4 py-4">{row.role}</td>
                    <td class="px-4 py-4">
                        <StatusBadge status={row.status}
                            >{row.status}</StatusBadge
                        >
                    </td>
                </tr>
            {/each}
        </DataGrid>
    </div>
</Story>
