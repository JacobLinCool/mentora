<script lang="ts">
    import { ChevronLeft, ChevronRight } from "@lucide/svelte";

    let {
        currentPage = $bindable(1),
        totalCount = 0,
        pageSize = 10,
    } = $props();

    let totalPages = $derived(Math.max(1, Math.ceil(totalCount / pageSize)));

    function goToPage(page: number) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
        }
    }

    function previousPage() {
        goToPage(currentPage - 1);
    }

    function nextPage() {
        goToPage(currentPage + 1);
    }

    // Helper to generate page numbers to display
    // Always shows first, last, current, and neighbors.
    function getVisiblePages(current: number, total: number) {
        if (total <= 7) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        const pages = [1];
        if (current > 3) {
            pages.push(-1); // -1 represents ellipsis '...'
        }

        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (current < total - 2) {
            pages.push(-1);
        }
        pages.push(total);

        return pages;
    }
</script>

<div class="flex items-center justify-center gap-2">
    <button
        onclick={previousPage}
        disabled={currentPage === 1}
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Previous page"
    >
        <ChevronLeft size={16} />
    </button>

    {#each getVisiblePages(currentPage, totalPages) as page}
        {#if page === -1}
            <span class="flex h-8 w-8 items-center justify-center text-gray-400"
                >...</span
            >
        {:else}
            <button
                onclick={() => goToPage(page)}
                class="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors
                {currentPage === page
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}"
            >
                {page}
            </button>
        {/if}
    {/each}

    <button
        onclick={nextPage}
        disabled={currentPage === totalPages}
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Next page"
    >
        <ChevronRight size={16} />
    </button>
</div>
