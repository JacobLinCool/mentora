<script lang="ts">
    import { Pencil, Trash2, Plus, Save } from "@lucide/svelte";
    import Table from "$lib/components/ui/Table.svelte";
    import * as m from "$lib/paraglide/messages.js";

    interface Announcement {
        id: string | number;
        title: string;
        content?: string;
        createdDate?: string;
        [key: string]: unknown;
    }

    let {
        announcements = [],
        onSave,
        onDelete,
    }: {
        announcements?: Announcement[];
        onSave?: (
            id: string | number | null,
            title: string,
            content: string,
        ) => void;
        onDelete?: (id: string | number) => void;
    } = $props();

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

    function openEditModal(item: Announcement) {
        modalMode = "edit";
        editingId = item.id;
        newTitle = item.title;
        newContent = item.content || "";
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
            onDelete?.(deletingId);
        }
        closeDeleteModal();
    }

    function closeDeleteModal() {
        isDeleteModalOpen = false;
        deletingId = null;
    }

    function saveAnnouncement() {
        onSave?.(editingId, newTitle, newContent);
        closeModal();
    }
</script>

<!-- Announcement Table -->
<div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <Table
        columns={[
            {
                key: "title",
                label: m.mentor_dashboard_table_title(),
                sortable: true,
            },
            {
                key: "createdDate",
                label: m.mentor_dashboard_table_created_date(),
                sortable: true,
            },
        ]}
        data={announcements}
        {renderCell}
        actions={renderActions}
    />
    <button
        type="button"
        class="mt-2 mb-2 ml-2 flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
        onclick={openModal}
    >
        <Plus size={16} />
        {m.mentor_dashboard_create()}
    </button>
</div>

{#snippet renderCell(item: Announcement, key: string)}
    {#if key === "title"}
        <button
            type="button"
            class="cursor-pointer border-none bg-transparent p-0 text-left text-gray-800 hover:underline"
            onclick={() => openEditModal(item)}
        >
            {item.title}
        </button>
    {:else}
        <div class="text-gray-600">{item[key]}</div>
    {/if}
{/snippet}

{#snippet renderActions(item: Announcement)}
    <button
        class="cursor-pointer hover:text-gray-800"
        onclick={() => openEditModal(item)}><Pencil size={18} /></button
    >
    <button
        class="cursor-pointer hover:text-red-600"
        onclick={() => deleteAnnouncement(item.id)}><Trash2 size={18} /></button
    >
{/snippet}

{#if isModalOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        role="dialog"
        aria-modal="true"
    >
        <button
            type="button"
            class="absolute inset-0 h-full w-full cursor-default border-none bg-transparent p-0 outline-none"
            onclick={closeModal}
            aria-label="Close modal"
        ></button>
        <div
            class="relative w-full max-w-2xl rounded-2xl bg-[#F5F5F5] p-8 shadow-lg"
        >
            <h2 class="mb-8 text-2xl font-bold text-black">
                {#if modalMode === "create"}
                    {m.mentor_announcement_create_modal_title()}
                {:else}
                    {m.mentor_announcement_edit_modal_title()}
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
                        placeholder={m.mentor_announcement_title_placeholder()}
                        class="w-full rounded-lg border border-gray-400 bg-transparent px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:border-gray-600 focus:ring-0 focus:outline-none"
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
                        placeholder={m.mentor_announcement_content_placeholder()}
                        rows="6"
                        class="w-full resize-none rounded-lg border border-gray-400 bg-transparent px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:border-gray-600 focus:ring-0 focus:outline-none"
                    ></textarea>
                </div>
            </div>

            <div class="mt-8 flex justify-center gap-4">
                {#if editingId}
                    <button
                        onclick={() => {
                            if (editingId) {
                                closeModal();
                                deleteAnnouncement(editingId);
                            }
                        }}
                        class="flex cursor-pointer items-center gap-2 rounded-full bg-white px-8 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-gray-50"
                    >
                        <Trash2 size={16} />
                        {m.delete()}
                    </button>
                {/if}
                <button
                    onclick={saveAnnouncement}
                    class="flex cursor-pointer items-center gap-2 rounded-full bg-white px-8 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                    <Save size={16} />
                    {m.done()}
                </button>
            </div>
        </div>
    </div>
{/if}

{#if isDeleteModalOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        role="dialog"
        aria-modal="true"
    >
        <button
            type="button"
            class="absolute inset-0 h-full w-full cursor-default border-none bg-transparent p-0 outline-none"
            onclick={closeDeleteModal}
            aria-label="Close modal"
        ></button>
        <div
            class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
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
