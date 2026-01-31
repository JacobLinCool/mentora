<script lang="ts">
    import {
        GripVertical,
        ClipboardList,
        MessageSquare,
        Hourglass,
        Pencil,
        Trash2,
        ChevronDown,
    } from "@lucide/svelte";

    interface Props {
        title: string;
        type: "questionnaire" | "dialogue";
        dueDate?: string;
        editMode?: boolean;
        isDragging?: boolean;
        isLast?: boolean;
        onEdit?: () => void;
        onDelete?: () => void;
    }

    let {
        title,
        type,
        dueDate = "",
        editMode = false,
        isDragging = false,
        isLast = false,
        onEdit,
        onDelete,
    }: Props = $props();
    function formatDate(dateStr: string) {
        // Handle "YYYY-MM-DDTHH:mm" format (from datetime-local)
        if (dateStr.includes("T")) {
            return dateStr.replace("T", " ").replace(/-/g, ".");
        }
        return dateStr;
    }
</script>

<div class="flex flex-col">
    <div
        class="assignment-item flex items-center gap-3 py-2"
        class:opacity-50={isDragging}
    >
        {#if editMode}
            <div
                class="drag-handle cursor-grab text-gray-400 hover:text-gray-600"
            >
                <GripVertical size={18} />
            </div>
        {/if}

        <div class="type-icon text-gray-600">
            {#if type === "questionnaire"}
                <ClipboardList size={20} />
            {:else}
                <MessageSquare size={20} />
            {/if}
        </div>

        <span class="flex-1 text-sm text-gray-800">{title}</span>

        {#if dueDate}
            <div
                class="flex items-center gap-1 font-mono text-sm text-gray-500"
            >
                <Hourglass size={14} />
                <span>{formatDate(dueDate)}</span>
            </div>
        {/if}

        {#if editMode}
            <div class="flex items-center gap-1">
                <button
                    type="button"
                    class="cursor-pointer p-1 text-gray-400 hover:text-gray-600"
                    onclick={onEdit}
                >
                    <Pencil size={16} />
                </button>
                <button
                    type="button"
                    class="cursor-pointer p-1 text-gray-400 hover:text-red-500"
                    onclick={onDelete}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        {/if}
    </div>

    {#if !isLast}
        <div class="-my-1.5 flex items-center gap-3">
            {#if editMode}
                <div class="w-[18px]"></div>
            {/if}
            <div class="flex w-[20px] justify-center text-gray-400">
                <ChevronDown size={16} />
            </div>
        </div>
    {/if}
</div>

<style>
    .assignment-item {
        transition: background-color 0.15s;
    }

    .assignment-item:hover {
        background-color: rgba(0, 0, 0, 0.02);
    }

    .drag-handle:active {
        cursor: grabbing;
    }
</style>
