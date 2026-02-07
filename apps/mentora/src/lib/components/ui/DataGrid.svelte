<script lang="ts" generics="T">
    import type { Snippet } from "svelte";

    interface Props<T> {
        headers?: string[];
        className?: string;
        data?: T[];
        renderCell?: (item: T, key: string) => string;
        children?: Snippet;
    }

    let {
        headers = [],
        className = "",
        data = [],
        renderCell,
        children,
    }: Props<T> = $props();
</script>

<div class="w-full overflow-x-auto {className}">
    <table class="w-full text-left text-sm">
        <thead>
            <tr class="border-glass-border border-b">
                {#each headers as header (header)}
                    <th
                        class="text-text-secondary px-4 py-4 font-sans text-xs font-medium tracking-wider uppercase"
                        >{header}</th
                    >
                {/each}
            </tr>
        </thead>
        <tbody class="divide-glass-border divide-y">
            {#if children}
                {@render children()}
            {:else if data.length > 0 && renderCell}
                {#each data as row, idx (idx)}
                    <tr class="transition-colors hover:bg-white/5">
                        {#each headers as header (header)}
                            <td class="px-4 py-4 align-top">
                                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                                {@html renderCell(row, header)}
                            </td>
                        {/each}
                    </tr>
                {/each}
            {/if}
        </tbody>
    </table>
</div>
