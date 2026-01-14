<script lang="ts">
    import {
        Calendar,
        MessageSquare,
        FileText,
        Lock,
        Check,
        Clock,
    } from "@lucide/svelte";

    interface Assignment {
        id: string;
        title: string;
        dueAt: number | null;
        type: "quiz" | "conversation" | "essay";
        completed: boolean;
        locked: boolean;
    }

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
    <!-- Timeline track -->
    <div class="timeline-track">
        {#each assignments as assignment, index (assignment.id)}
            <!-- Connection line (not for first item) -->
            {#if index > 0}
                <div
                    class="timeline-connector {assignments[index - 1].completed
                        ? 'completed'
                        : ''}"
                ></div>
            {/if}

            <!-- Status indicator -->
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
        {/each}
    </div>

    <!-- Assignment cards -->
    <div class="assignment-cards">
        {#each assignments as assignment (assignment.id)}
            {@const Icon = getTypeIcon(assignment.type)}
            <button
                class="assignment-card {assignment.completed
                    ? 'completed'
                    : ''} {assignment.locked ? 'locked' : ''}"
                onclick={() => handleClick(assignment)}
                disabled={assignment.locked}
            >
                <div class="card-icon">
                    <Icon class="type-icon" />
                </div>
                <div class="card-content">
                    <h4 class="card-title">{assignment.title}</h4>
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
        {/each}
    </div>
</div>

<style>
    .assignment-timeline {
        display: flex;
        gap: 1rem;
        padding: 1.5rem;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
    }

    /* Timeline Track Styles */
    .timeline-track {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.5rem 0;
        width: 2.5rem;
        flex-shrink: 0;
    }

    .timeline-connector {
        width: 2px;
        height: 3rem;
        background: rgba(255, 255, 255, 0.15);
        transition: background 0.3s ease;
    }

    .timeline-connector.completed {
        background: linear-gradient(180deg, #4ade80, #22c55e);
    }

    .status-indicator {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        flex-shrink: 0;
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

    /* Assignment Cards Styles */
    .assignment-cards {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .assignment-card {
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

    .assignment-card.locked {
        cursor: not-allowed;
        opacity: 0.5;
    }

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
