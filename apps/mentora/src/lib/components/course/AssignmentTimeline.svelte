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
    import {
        Calendar,
        MessageSquare,
        FileText,
        Lock,
        Check,
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
</script>

<div class="flex flex-col p-6 backdrop-blur-[12px]">
    {#each assignments as assignment, index (assignment.id)}
        {@const Icon = getTypeIcon(assignment.type)}
        {@const isSubmitted =
            assignment.submissionState === "submitted" ||
            assignment.submissionState === "graded_complete" ||
            assignment.completed}

        <div
            class="relative flex gap-4 {index !== assignments.length - 1
                ? 'pb-8'
                : ''}"
        >
            <!-- Timeline Column (Line + Dot) -->
            <div
                class="relative flex w-10 shrink-0 flex-col items-center justify-center"
            >
                <!-- Top Line (connect to previous) -->
                {#if index > 0}
                    <div
                        class="absolute top-[-2rem] left-1/2 z-0 h-[calc(50%+2rem)] w-[2px] -translate-x-1/2 bg-white/15 transition-colors duration-300 ease-in-out"
                    ></div>
                {/if}

                <!-- Status Dot -->
                <div
                    class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-in-out
                        {assignment.completed
                        ? 'bg-linear-to-br from-[#4ade80] to-[#22c55e] shadow-[0_0_12px_rgba(74,222,128,0.4)]'
                        : 'bg-transparent'}"
                >
                    {#if assignment.completed}
                        <Check class="h-4 w-4 text-white" />
                    {:else if assignment.locked}
                        <!-- Inactive dot for locked assignments -->
                        <div class="h-2 w-2 rounded-full bg-white/25"></div>
                    {:else}
                        <!-- Glowing active dot for pending assignments -->
                        <div
                            class="h-[10px] w-[10px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                        ></div>
                    {/if}
                </div>

                <!-- Bottom Line (connect to next) -->
                {#if index < assignments.length - 1}
                    <div
                        class="absolute top-1/2 bottom-0 left-1/2 z-0 h-[calc(50%+2rem)] w-[2px] -translate-x-1/2 bg-white/15 transition-colors duration-300 ease-in-out"
                    ></div>
                {/if}
            </div>

            <!-- Card Column -->
            <div class="flex min-w-0 flex-1 items-center">
                <button
                    class="relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl bg-white/10 p-4 text-left shadow-black/20 backdrop-blur-md transition-all duration-300 ease-in-out
                           {assignment.completed
                        ? 'border-[#4ade80]/30'
                        : isSubmitted
                          ? 'border-2 border-[#4ade80] bg-[rgba(74,222,128,0.05)]'
                          : 'border-white/15 from-white/10 to-white/5'} 
                           {assignment.locked
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:translate-x-1 hover:border-white/20 hover:from-white/20 hover:to-white/10'}"
                    onclick={() => handleClick(assignment)}
                    disabled={assignment.locked}
                >
                    <div
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                    >
                        <Icon class="h-5 w-5 text-white/85" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-2">
                            <h4
                                class="m-0 text-base leading-tight font-semibold text-white"
                            >
                                {assignment.title}
                            </h4>
                        </div>
                        {#if assignment.dueAt}
                            <p class="mt-1 mb-0 text-xs text-white/50">
                                <Clock size={12} class="me-1 inline-block" />
                                {formatDueDate(assignment.dueAt)}
                            </p>
                        {/if}
                    </div>
                    {#if assignment.locked}
                        <div
                            class="pointer-events-none absolute inset-0 flex items-center justify-end pr-4"
                        >
                            <Lock class="h-5 w-5 text-white/20" />
                        </div>
                    {/if}
                </button>
            </div>
        </div>
    {/each}
</div>
