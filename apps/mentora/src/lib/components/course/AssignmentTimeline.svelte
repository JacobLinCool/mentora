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

<div class="assignment-timeline">
    {#each assignments as assignment, index (assignment.id)}
        {@const Icon = getTypeIcon(assignment.type)}
        {@const isSubmitted =
            assignment.submissionState === "submitted" ||
            assignment.submissionState === "graded_complete" ||
            assignment.completed}

        <div class="timeline-row">
            <!-- Timeline Column (Line + Dot) -->
            <div class="timeline-column">
                <!-- Top Line (connect to previous) -->
                {#if index > 0}
                    <div class="timeline-line top"></div>
                {/if}

                <!-- Status Dot -->
                <div
                    class="status-indicator {assignment.completed
                        ? 'completed'
                        : assignment.locked
                          ? 'locked'
                          : 'pending'}"
                >
                    {#if assignment.completed}
                        <Check class="status-icon" />
                    {:else if assignment.locked}
                        <Lock class="status-icon locked-icon" />
                    {:else}
                        <div class="status-dot"></div>
                    {/if}
                </div>

                <!-- Bottom Line (connect to next) -->
                {#if index < assignments.length - 1}
                    <div class="timeline-line bottom"></div>
                {/if}
            </div>

            <!-- Card Column -->
            <div class="card-column">
                <button
                    class="assignment-card {assignment.completed
                        ? 'completed'
                        : ''} 
                           {assignment.locked ? 'locked' : ''}
                           {isSubmitted ? 'submitted-border' : ''}"
                    onclick={() => handleClick(assignment)}
                    disabled={assignment.locked}
                >
                    <div class="card-icon">
                        <Icon class="type-icon" />
                    </div>
                    <div class="card-content">
                        <div class="flex items-center justify-between gap-2">
                            <h4 class="card-title">{assignment.title}</h4>
                        </div>
                        {#if assignment.dueAt}
                            <p class="card-due">
                                <Clock size={12} class="me-1 inline-block" />
                                {formatDueDate(assignment.dueAt)}
                            </p>
                        {/if}
                    </div>
                    {#if assignment.locked}
                        <div class="locked-overlay">
                            <Lock class="lock-icon" />
                        </div>
                    {/if}
                </button>
            </div>
        </div>
    {/each}
</div>

<style>
    .assignment-timeline {
        display: flex;
        flex-direction: column;
        padding: 1.5rem;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
    }

    .timeline-row {
        display: flex;
        gap: 1rem;
        position: relative;
    }

    /* Remove extra bottom padding from last item */
    .timeline-row:not(:last-child) {
        padding-bottom: 2rem;
    }

    /* Timeline Column */
    .timeline-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center; /* Center dot vertically if container has height */
        width: 2.5rem;
        flex-shrink: 0;
        position: relative;
        /* If we want the dot centered relative to the Row, we need this column to be full height of row? 
           Yes. But we also need 'justify-content: center' 
           or 'm-auto' on the dot.
        */
    }

    /* Lines */
    .timeline-line {
        position: absolute;
        width: 2px;
        background: rgba(255, 255, 255, 0.15);
        transition: background 0.3s ease;
        left: 50%;
        transform: translateX(-50%);
        z-index: 0;
    }

    /* Top half line: connects Previous Row to Center of this dot */
    .timeline-line.top {
        top: 0;
        /* To connect to previous row, we need to go up negative margin? 
           Or simpler: 
           This element starts at top of ROW. 
           Goes down to 50% (center). 
           BUT we have gap between rows (timeline-row gap/padding).
           The gap/padding is INSIDE the row element if we used padding-bottom.
        */
        height: 50%;
        /* But the previous row has bottom padding. 
           We need to cover that.
           Actually simpler: 
           `top: -2rem` (cover previous padding)
           `bottom: 50%` (or height: calc(50% + 2rem))
        */
        top: -2rem;
        height: calc(50% + 2rem);
    }

    /* Removed .completed style from Lines as requested. Lines should always be default color. */

    /* Bottom half line: connects Center of this dot to Next Row */
    .timeline-line.bottom {
        top: 50%;
        height: calc(50% + 2rem); /* 50% of content + 2rem padding */
    }

    /* Card Column */
    .card-column {
        flex: 1;
        min-width: 0;
        /* Ensure card aligns with dot. Dot is 2rem height. */
        /* If card height varies, we want top alignment? */
        display: flex;
        align-items: center; /* Changed from flex-start to center for vertical alignment */
    }

    /* Status Indicator */
    .status-indicator {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        flex-shrink: 0;
        position: relative;
        z-index: 1; /* Above line */
    }

    .status-indicator.completed {
        background: linear-gradient(135deg, #4ade80, #22c55e);
        box-shadow: 0 0 12px rgba(74, 222, 128, 0.4);
    }

    .status-indicator.pending {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .status-indicator.locked {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
    }

    .status-indicator :global(.status-icon) {
        width: 1rem;
        height: 1rem;
        color: #fff;
    }

    .status-indicator :global(.locked-icon) {
        width: 0.875rem;
        height: 0.875rem;
        color: rgba(255, 255, 255, 0.3);
    }

    .status-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
    }

    /* Assignment Card */
    .assignment-card {
        width: 100%;
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 1rem 1.25rem;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.12),
            rgba(255, 255, 255, 0.06)
        );
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: left;
        overflow: hidden;
    }

    .assignment-card:hover:not(.locked) {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.18),
            rgba(255, 255, 255, 0.1)
        );
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateX(4px);
    }

    .assignment-card.completed {
        border-color: rgba(74, 222, 128, 0.3);
    }

    .assignment-card.submitted-border {
        border: 2px solid #4ade80; /* Green thick border */
        background: rgba(74, 222, 128, 0.05);
    }

    .assignment-card.locked {
        cursor: not-allowed;
        opacity: 0.5;
    }

    /* .card-icon ... locked-overlay ... same as before */
    .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0.625rem;
        flex-shrink: 0;
    }

    .card-icon :global(.type-icon) {
        width: 1.125rem;
        height: 1.125rem;
        color: rgba(255, 255, 255, 0.85);
    }

    .card-content {
        flex: 1;
        min-width: 0;
    }

    .card-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        line-height: 1.3;
    }

    .card-due {
        margin: 0.25rem 0 0;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
    }

    .locked-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 1rem;
        pointer-events: none;
    }

    .locked-overlay :global(.lock-icon) {
        width: 1.25rem;
        height: 1.25rem;
        color: rgba(255, 255, 255, 0.2);
    }
</style>
