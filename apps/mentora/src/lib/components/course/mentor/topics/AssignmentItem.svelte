<script lang="ts">
    import { tick } from "svelte";
    import { m } from "$lib/paraglide/messages";
    import { resolve } from "$app/paths";
    import {
        GripVertical,
        ClipboardList,
        MessageSquare,
        Hourglass,
        Trash2,
        ChevronDown,
        BarChart3,
    } from "@lucide/svelte";

    interface Props {
        courseId?: string;
        assignmentId?: string;
        title: string;
        type: "questionnaire" | "dialogue";
        dueDate?: string;
        editMode?: boolean;
        isDragging?: boolean;
        isLast?: boolean;
        onOpenEditor?: () => void;
        onSaveTitle?: (title: string) => void;
        onDelete?: () => void;
    }

    let {
        courseId,
        assignmentId,
        title,
        type,
        dueDate = "",
        editMode = false,
        isDragging = false,
        isLast = false,
        onOpenEditor,
        onSaveTitle,
        onDelete,
    }: Props = $props();

    let isInlineEditing = $state(false);
    let draftTitle = $state("");
    let titleInput = $state<HTMLInputElement | null>(null);

    $effect(() => {
        if (!isInlineEditing) {
            draftTitle = title;
        }
    });
    function formatDate(dateStr: string) {
        // Handle "YYYY-MM-DDTHH:mm" format (from datetime-local)
        if (dateStr.includes("T")) {
            return dateStr.replace("T", " ").replace(/-/g, ".");
        }
        return dateStr;
    }

    async function enterInlineEdit() {
        draftTitle = title;
        isInlineEditing = true;
        await tick();
        titleInput?.focus();
        titleInput?.select();
    }

    function commitInlineEdit() {
        const nextTitle = draftTitle.trim() || title;
        isInlineEditing = false;
        if (nextTitle !== title) {
            onSaveTitle?.(nextTitle);
        }
    }

    function cancelInlineEdit() {
        draftTitle = title;
        isInlineEditing = false;
    }

    function handleTitleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            commitInlineEdit();
        } else if (event.key === "Escape") {
            event.preventDefault();
            cancelInlineEdit();
        }
    }

    function handleRowClick() {
        onOpenEditor?.();
    }

    function stopPropagation(event: Event) {
        event.stopPropagation();
    }
</script>

<div class="flex flex-col">
    <div
        class="assignment-item flex items-center gap-3 rounded-md py-3 focus:ring-0 focus:outline-none"
        class:opacity-50={isDragging}
        class:cursor-pointer={!!onOpenEditor}
        onclick={handleRowClick}
    >
        <button
            type="button"
            class="drag-handle cursor-grab border-none bg-transparent p-0 text-gray-400 hover:text-gray-600"
            onclick={stopPropagation}
            aria-label={m.mentor_assignment_reorder()}
        >
            <GripVertical size={18} />
        </button>

        <div class="type-icon text-gray-600">
            {#if type === "questionnaire"}
                <ClipboardList size={20} />
            {:else}
                <MessageSquare size={20} />
            {/if}
        </div>

        <div class="flex-1">
            {#if isInlineEditing}
                <input
                    type="text"
                    bind:value={draftTitle}
                    bind:this={titleInput}
                    class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 focus:outline-none"
                    onblur={commitInlineEdit}
                    onkeydown={handleTitleKeydown}
                    onclick={stopPropagation}
                />
            {:else}
                <button
                    type="button"
                    class="cursor-pointer border-none bg-transparent p-0 text-left text-sm text-gray-800 transition-colors hover:text-gray-950"
                    onclick={stopPropagation}
                    ondblclick={enterInlineEdit}
                    aria-label={m.edit()}
                >
                    {title}
                </button>
            {/if}
        </div>

        {#if dueDate}
            <div
                class="flex items-center gap-1 font-mono text-sm text-gray-500"
            >
                <Hourglass size={14} />
                <span>{formatDate(dueDate)}</span>
            </div>
        {/if}

        {#if !editMode && type === "dialogue" && courseId && assignmentId}
            <a
                href={resolve(
                    `/host/courses/${courseId}/assignments/${assignmentId}/analytics`,
                )}
                class="p-1 text-gray-400 hover:text-blue-500"
                title="班級分析"
                onclick={stopPropagation}
            >
                <BarChart3 size={16} />
            </a>
        {/if}

        <div class="flex items-center gap-1">
            <button
                type="button"
                class="cursor-pointer p-1 text-gray-400 hover:text-red-500"
                onclick={(event) => {
                    event.stopPropagation();
                    onDelete?.();
                }}
                aria-label={m.delete()}
            >
                <Trash2 size={16} />
            </button>
        </div>
    </div>

    {#if !isLast && !isDragging}
        <div class="flex items-center gap-3 py-0.5">
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
