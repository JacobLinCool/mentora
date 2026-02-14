export const TOTAL_CONVERSATION_STAGES = 5;

const STAGE_MAP = {
    awaiting_idea: 1,
    adding_counterpoint: 2,
    awaiting_followup: 3,
    adding_final_summary: 4,
    closed: 5,
} as const;

export function resolveConversationStage(
    state: string | null | undefined,
): number {
    if (!state) return 1;
    return STAGE_MAP[state as keyof typeof STAGE_MAP] ?? 1;
}
