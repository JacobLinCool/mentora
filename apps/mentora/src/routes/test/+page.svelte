<script lang="ts">
    import { api } from "$lib/test";
    import PageHead from "$lib/components/PageHead.svelte";

    const data = $derived(api.data);
    $inspect(data);
</script>

<PageHead title="Test API" description="Test page for API functionality" />

<div class="container mx-auto p-8">
    <h1 class="mb-6 text-3xl font-bold">Test API Page</h1>

    <div class="m-2 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <h2 class="mb-2 text-xl font-semibold">
            Using `data.initialized` and `data.data`
        </h2>
        {#if data.initialized}
            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <span
                        class="font-semibold text-green-600 dark:text-green-400"
                    >
                        ✓ Initialized
                    </span>
                </div>

                {#if data.data}
                    <div
                        class="border-t border-gray-200 pt-4 dark:border-gray-700"
                    >
                        <h2 class="mb-2 text-xl font-semibold">Data:</h2>
                        <div class="rounded bg-gray-50 p-4 dark:bg-gray-900">
                            <pre class="text-sm">{JSON.stringify(
                                    data.data,
                                    null,
                                    2,
                                )}</pre>
                        </div>
                    </div>
                {:else}
                    <div class="text-gray-600 dark:text-gray-400">
                        No data available
                    </div>
                {/if}
            </div>
        {:else}
            <div class="flex items-center gap-3">
                <div
                    class="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"
                ></div>
                <span class="text-gray-600 dark:text-gray-400">
                    Loading data...
                </span>
            </div>
        {/if}
    </div>

    <div class="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 class="mb-2 font-semibold">About this test:</h3>
        <p class="text-sm text-gray-700 dark:text-gray-300">
            This page tests the async data loading pattern with Svelte 5 runes.
            The API simulates a 3-second delay before returning data.
        </p>
    </div>
</div>
