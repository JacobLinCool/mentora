<script module lang="ts">
    export interface Assignment {
        id: string;
        title: string;
        dueAt: number | null;
        type: "quiz" | "conversation" | "essay" | "questionnaire";
        completed: boolean; // This maps to "is done"
        locked: boolean;
        submissionState?: "in_progress" | "submitted" | "graded_complete"; // NEW: Explicit state
    }
</script>

<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import {
        Calendar,
        ChevronRight,
        MessageSquare,
        FileText,
        Lock,
        Clock,
    } from "@lucide/svelte";

    interface Props {
        assignments: Assignment[];
        onAssignmentClick?: (assignment: Assignment) => void;
    }

    let { assignments, onAssignmentClick }: Props = $props();

    function formatDueDate(timestamp: number | null): string {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}.${month}.${day} ${hours}:${minutes}`;
    }

    function getTypeIcon(type: Assignment["type"]) {
        switch (type) {
            case "quiz":
                return Calendar;
            case "conversation":
                return MessageSquare;
            case "essay":
                return FileText;
            default:
                return FileText;
        }
    }

    function handleClick(assignment: Assignment) {
        if (!assignment.locked) {
            onAssignmentClick?.(assignment);
        }
    }

    function formatOverdueDuration(timestamp: number): string {
        const diffMs = Math.max(0, Date.now() - timestamp);
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return m.student_course_overdue_duration({ hours, minutes });
    }
</script>

<div class="flex flex-col gap-3">
    {#each assignments as assignment, index (assignment.id)}
        {@const Icon = getTypeIcon(assignment.type)}
        {@const isSubmitted =
            assignment.submissionState === "submitted" ||
            assignment.submissionState === "graded_complete" ||
            assignment.completed}
        {@const isOverdue =
            !!assignment.dueAt &&
            assignment.dueAt < Date.now() &&
            !assignment.completed}

        <div
            class="relative flex gap-4 {index !== assignments.length - 1
                ? 'pb-2'
                : ''}"
        >
            <div
                class="relative flex w-8 shrink-0 flex-col items-center justify-start pt-5"
            >
                {#if index > 0}
                    <div
                        class="absolute top-[-1rem] left-1/2 z-0 h-[calc(50%+1rem)] w-px -translate-x-1/2 bg-white/12"
                    ></div>
                {/if}

                <div
                    class="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6a6a6a]"
                >
                    {#if assignment.completed}
                        <div class="h-3.5 w-3.5 rounded-full bg-white"></div>
                    {:else if assignment.locked}
                        <Lock class="h-3.5 w-3.5 text-white/42" />
                    {:else}
                        <div class="h-2.5 w-2.5 rounded-full bg-white/90"></div>
                    {/if}
                </div>

                {#if index < assignments.length - 1}
                    <div
                        class="absolute top-7 bottom-[-1rem] left-1/2 z-0 w-px -translate-x-1/2 bg-white/12"
                    ></div>
                {/if}
            </div>

            <button
                class="student-panel student-panel-hover relative flex w-full items-center gap-3 overflow-hidden rounded-[1.5rem] px-4 py-4 text-left transition-all duration-200 {assignment.locked
                    ? 'cursor-not-allowed opacity-55'
                    : 'student-clickable active:scale-[0.99]'} {isSubmitted
                    ? 'bg-[#646464]'
                    : ''}"
                onclick={() => handleClick(assignment)}
                disabled={assignment.locked}
            >
                <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center self-center"
                >
                    <Icon class="h-5 w-5 text-white/82" />
                </div>
                <div class="min-w-0 flex-1">
                    <h4
                        class="m-0 text-[0.98rem] leading-snug font-semibold text-white"
                    >
                        {assignment.title}
                    </h4>
                    {#if assignment.dueAt}
                        <p
                            class="mt-2 mb-0 text-[0.8rem] leading-none {isOverdue
                                ? 'text-[#ff9e9e]'
                                : 'text-white/50'}"
                        >
                            <Clock size={12} class="me-1 inline-block" />
                            {#if isOverdue}
                                {formatOverdueDuration(assignment.dueAt)}
                            {:else}
                                {m.assignments_due()}:
                                {formatDueDate(assignment.dueAt)}
                            {/if}
                        </p>
                    {/if}
                </div>
                {#if assignment.locked}
                    <Lock class="h-5 w-5 shrink-0 self-center text-white/22" />
                {:else}
                    <ChevronRight
                        class="h-5 w-5 shrink-0 self-center text-white/32"
                    />
                {/if}
            </button>
        </div>
    {/each}
</div>
