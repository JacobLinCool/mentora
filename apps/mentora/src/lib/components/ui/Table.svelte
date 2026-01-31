<script lang="ts">
    import {
        ChevronLeft,
        ChevronRight,
        ChevronUp,
        ChevronDown,
    } from "@lucide/svelte";
    import type { Snippet } from "svelte";

    interface Column {
        key: string;
        label: string;
        sortable?: boolean;
    }

    interface Props {
        columns: Column[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any[];
        pageSize?: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderCell?: Snippet<[item: any, key: string]>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actions?: Snippet<[item: any]>;
        className?: string;
    }

    let {
        columns,
        data,
        pageSize = 10,
        renderCell,
        actions,
        className = "",
    }: Props = $props();

    // Sorting state
    let sortKey = $state<string | null>(null);
    let sortDirection = $state<"asc" | "desc">("asc");

    // Pagination state
    let currentPage = $state(0);

    // Computed: sorted data
    const sortedData = $derived.by(() => {
        if (!sortKey) return data;
        const key = sortKey; // Narrow type to string
        return [...data].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
            if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    });

    // Computed: paginated data
    const totalPages = $derived(Math.ceil(sortedData.length / pageSize));
    const paginatedData = $derived(
        sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
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
        currentPage = 0;
    }

    function prevPage() {
        if (currentPage > 0) currentPage--;
    }

    function nextPage() {
        if (currentPage < totalPages - 1) currentPage++;
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
            {#each paginatedData as row, idx (idx)}
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
        <div
            class="flex items-center justify-end gap-2 px-4 py-3 text-sm text-gray-600"
        >
            <span>
                {currentPage * pageSize + 1}-{Math.min(
                    (currentPage + 1) * pageSize,
                    data.length,
                )} / {data.length}
            </span>
            <button
                type="button"
                class="rounded p-1 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
                disabled={currentPage === 0}
                onclick={prevPage}
            >
                <ChevronLeft size={18} />
            </button>
            <button
                type="button"
                class="rounded p-1 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
                disabled={currentPage >= totalPages - 1}
                onclick={nextPage}
            >
                <ChevronRight size={18} />
            </button>
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
