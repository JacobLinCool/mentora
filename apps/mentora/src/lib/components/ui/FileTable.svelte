<script lang="ts">
    import Table from "./Table.svelte";
    import { Plus } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";

    interface FileItem {
        name: string;
        uploadedAt: string;
    }

    interface Props {
        files: FileItem[];
        onUpload?: () => void;
        showUploadButton?: boolean;
    }

    let { files = [], onUpload, showUploadButton = true }: Props = $props();

    const columns = [
        { key: "name", label: m.mentor_assignment_file_name(), sortable: true },
        {
            key: "uploadedAt",
            label: m.mentor_assignment_upload_time(),
            sortable: true,
        },
    ];
</script>

<div class="file-table-container">
    <Table {columns} data={files} pageSize={10} />

    {#if showUploadButton && onUpload}
        <button
            type="button"
            class="upload-btn mt-2 flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
            onclick={onUpload}
        >
            <Plus size={16} />
            {m.mentor_assignment_upload_file()}
        </button>
    {/if}
</div>

<style>
    .file-table-container {
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        overflow: hidden;
    }

    .upload-btn {
        margin: 0.5rem;
    }
</style>
