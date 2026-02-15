<script lang="ts" generics="TRow extends Record<string, unknown>">
    import { ChevronUp, ChevronDown } from "@lucide/svelte";
    import Pagination from "./Pagination.svelte";
    import type { Snippet } from "svelte";

    interface Column {
        key: string;
        label: string;
        sortable?: boolean;
    }

    interface Props {
        columns: Column[];
        data: TRow[];
        pageSize?: number;
        renderCell?: Snippet<[item: TRow, key: string]>;
        actions?: Snippet<[item: TRow]>;
        getRowKey?: (item: TRow, index: number) => string | number;
        className?: string;
    }

    let {
        columns,
        data,
        pageSize = 10,
        renderCell,
        actions,
        getRowKey,
        className = "",
    }: Props = $props();

    // Sorting state
    let sortKey = $state<string | null>(null);
    let sortDirection = $state<"asc" | "desc">("asc");

    // Pagination state
    let currentPage = $state(1);

    // Computed: sorted data
    const sortedData = $derived.by(() => {
        if (!sortKey) return data;
        const key = sortKey; // Narrow type to string
        return [...data].sort((a, b) => {
            const aRaw = a[key];
            const bRaw = b[key];
            const aVal = typeof aRaw === "number" ? aRaw : String(aRaw ?? "");
            const bVal = typeof bRaw === "number" ? bRaw : String(bRaw ?? "");

            if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
            if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    });

    // Computed: paginated data
    const totalPages = $derived(Math.ceil(sortedData.length / pageSize));
    const paginatedData = $derived(
        sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    );

    function handleSort(key: string) {
        const column = columns.find((c) => c.key === key);
        if (!column?.sortable) return;

        if (sortKey === key) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortKey = key;
            sortDirection = "asc";
        }
        currentPage = 1;
    }
</script>

<div class="table-container {className}">
    <table class="w-full text-left text-sm">
        <thead>
            <tr class="border-b border-gray-300">
                {#each columns as column (column.key)}
                    <th
                        class="px-4 py-3 font-medium text-gray-600"
                        class:cursor-pointer={column.sortable}
                        class:hover:bg-gray-200={column.sortable}
                        onclick={() =>
                            column.sortable && handleSort(column.key)}
                    >
                        <div class="flex items-center gap-1">
                            {column.label}
                            {#if column.sortable}
                                <span class="text-gray-400">
                                    {#if sortKey === column.key}
                                        {#if sortDirection === "asc"}
                                            <ChevronUp size={14} />
                                        {:else}
                                            <ChevronDown size={14} />
                                        {/if}
                                    {:else}
                                        <ChevronUp
                                            size={14}
                                            class="opacity-30"
                                        />
                                    {/if}
                                </span>
                            {/if}
                        </div>
                    </th>
                {/each}
                {#if actions}
                    <th class="w-[80px] px-4 py-3 font-medium text-gray-600">
                    </th>
                {/if}
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
            {#each paginatedData as row, idx (getRowKey ? getRowKey(row, idx) : (((row as { id?: string | number }).id ?? `${currentPage}-${idx}`) as string | number))}
                <tr class="transition-colors hover:bg-gray-100">
                    {#each columns as column (column.key)}
                        <td class="px-4 py-3">
                            {#if renderCell}
                                {@render renderCell(row, column.key)}
                            {:else}
                                {row[column.key] ?? ""}
                            {/if}
                        </td>
                    {/each}
                    {#if actions}
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                                {@render actions(row)}
                            </div>
                        </td>
                    {/if}
                </tr>
            {/each}
        </tbody>
    </table>

    {#if totalPages > 1}
        <div class="border-t border-gray-200 px-4 py-3">
            <Pagination
                bind:currentPage
                totalCount={sortedData.length}
                {pageSize}
            />
        </div>
    {/if}
</div>

<style>
    .table-container {
        background: white;
        border-radius: 8px;
        overflow: hidden;
    }
</style>
