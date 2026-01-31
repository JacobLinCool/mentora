<script lang="ts">
    import { Pencil, Trash2, Plus, Save } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";

    let { announcements = [] } = $props();

    let isModalOpen = $state(false);
    let isDeleteModalOpen = $state(false);
    let modalMode = $state<"create" | "view" | "edit">("create");
    let editingId = $state<string | number | null>(null);
    let deletingId = $state<string | number | null>(null);
    let newTitle = $state("");
    let newContent = $state("");

    function openModal() {
        modalMode = "create";
        editingId = null;
        newTitle = "";
        newContent = "";
        isModalOpen = true;
    }

    function openEditModal(item: {
        id: string | number;
        title: string;
        content?: string;
    }) {
        modalMode = "edit";
        editingId = item.id;
        newTitle = item.title;
        newContent = item.content || m.no_content();
        isModalOpen = true;
    }

    function openViewModal(item: {
        id: string | number;
        title: string;
        content?: string;
    }) {
        modalMode = "view";
        editingId = item.id;
        newTitle = item.title;
        newContent = item.content || m.no_content();
        isModalOpen = true;
    }

    function closeModal() {
        isModalOpen = false;
        editingId = null;
        newTitle = "";
        newContent = "";
    }

    function deleteAnnouncement(id: string | number) {
        deletingId = id;
        isDeleteModalOpen = true;
    }

    function confirmDelete() {
        if (deletingId) {
            console.log("Deleting:", deletingId);
            // Implement delete logic here
        }
        closeDeleteModal();
    }

    function closeDeleteModal() {
        isDeleteModalOpen = false;
        deletingId = null;
    }

    function saveAnnouncement() {
        // Here you would typically dispatch an event or call an API
        console.log("Saving:", {
            mode: modalMode,
            id: editingId,
            newTitle,
            newContent,
        });
        closeModal();
    }
</script>

<!-- Announcement Section -->
<div class="mb-6 flex items-center justify-between">
    <button
        onclick={openModal}
        class="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
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
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="cursor-pointer text-gray-800 hover:underline"
                    onclick={() => openViewModal(item)}
                >
                    {item.title}
                </div>
                <div class="text-gray-600">{item.createdDate}</div>
                <div class="flex justify-end gap-3 text-gray-500">
                    <button
                        class="cursor-pointer hover:text-gray-800"
                        onclick={() => openEditModal(item)}
                        ><Pencil size={18} /></button
                    >
                    <button
                        class="cursor-pointer hover:text-red-600"
                        onclick={() => deleteAnnouncement(item.id)}
                        ><Trash2 size={18} /></button
                    >
                </div>
            </div>
        {/each}
    </div>
</div>

{#if isModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onclick={closeModal}
    >
        <div
            class="w-full max-w-2xl rounded-2xl bg-[#F5F5F5] p-8 shadow-lg"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="mb-8 text-2xl font-bold text-black">
                {#if modalMode === "create"}
                    {m.mentor_announcement_create_modal_title()}
                {:else if modalMode === "edit"}
                    {m.mentor_announcement_edit_modal_title()}
                {:else}
                    {m.mentor_announcement_detail_title()}
                {/if}
            </h2>

            <div class="space-y-6">
                <!-- Title -->
                <div class="space-y-2">
                    <label
                        for="announcement-title"
                        class="text-sm font-medium text-gray-600"
                    >
                        {m.mentor_announcement_title_label()}
                    </label>
                    <input
                        id="announcement-title"
                        type="text"
                        bind:value={newTitle}
                        readonly={modalMode === "view"}
                        placeholder={m.mentor_announcement_title_placeholder()}
                        class="w-full rounded-lg border border-gray-400 bg-transparent px-4 py-2.5 text-gray-800 placeholder-gray-400 read-only:border-gray-300 read-only:text-gray-600 focus:border-gray-600 focus:ring-0 focus:outline-none"
                    />
                </div>

                <!-- Content -->
                <div class="space-y-2">
                    <label
                        for="announcement-content"
                        class="text-sm font-medium text-gray-600"
                    >
                        {m.mentor_announcement_content_label()}
                    </label>
                    <textarea
                        id="announcement-content"
                        bind:value={newContent}
                        readonly={modalMode === "view"}
                        placeholder={m.mentor_announcement_content_placeholder()}
                        rows="6"
                        class="w-full resize-none rounded-lg border border-gray-400 bg-transparent px-4 py-2.5 text-gray-800 placeholder-gray-400 read-only:border-gray-300 read-only:text-gray-600 focus:border-gray-600 focus:ring-0 focus:outline-none"
                    ></textarea>
                </div>
            </div>

            {#if modalMode !== "view"}
                <div class="mt-8 flex justify-center gap-4">
                    <button
                        onclick={saveAnnouncement}
                        class="flex cursor-pointer items-center gap-2 rounded-full bg-white px-8 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                    >
                        <Save size={16} />
                        {m.save()}
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

{#if isDeleteModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onclick={closeDeleteModal}
    >
        <div
            class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
            onclick={(e) => e.stopPropagation()}
        >
            <h3 class="mb-4 text-xl font-bold text-gray-900">
                {m.mentor_dashboard_delete_title()}
            </h3>
            <p class="mb-6 text-sm text-gray-600">
                {m.mentor_dashboard_delete_confirm()}
            </p>

            <div class="flex justify-end gap-3">
                <button
                    onclick={closeDeleteModal}
                    class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                    {m.cancel()}
                </button>
                <button
                    onclick={confirmDelete}
                    class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                    {m.delete()}
                </button>
            </div>
        </div>
    </div>
{/if}
