<script lang="ts">
    import { Pencil, Trash2, Plus } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";

    let { courseTitle = "", announcements = [] } = $props();
</script>

<!-- Announcement Section -->
<div class="mb-6 flex items-center justify-between">
    <h3 class="text-xl font-normal text-black">
        {m.mentor_dashboard_announcement()}
    </h3>
    <button
        class="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
    >
        <Plus size={16} />
        {m.mentor_dashboard_create()}
    </button>
</div>

<!-- Announcement Table -->
<div
    class="overflow-hidden rounded-xl border border-gray-100 bg-[#F5F5F5] shadow-sm"
>
    <div
        class="grid grid-cols-[3fr_2fr_1fr] border-b border-gray-200/50 p-6 font-medium text-gray-600"
    >
        <div>{m.mentor_dashboard_table_title()}</div>
        <div>{m.mentor_dashboard_table_created_date()}</div>
        <div class="text-right"></div>
    </div>
    <div class="flex flex-col divide-y divide-gray-200/50">
        {#each announcements as item (item.id)}
            <div
                class="grid grid-cols-[3fr_2fr_1fr] items-center p-6 transition-colors hover:bg-gray-50"
            >
                <div class="text-gray-800">{item.title}</div>
                <div class="text-gray-600">{item.createdDate}</div>
                <div class="flex justify-end gap-3 text-gray-500">
                    <button class="hover:text-gray-800"
                        ><Pencil size={18} /></button
                    >
                    <button class="hover:text-red-600"
                        ><Trash2 size={18} /></button
                    >
                </div>
            </div>
        {/each}
    </div>
</div>
