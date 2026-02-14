/**
 * Shared response formatting for stage handlers
 */

/**
 * Common fields present in all stage response types
 */
export interface StageResponseFields {
    response_message: string;
    concise_question: string;
}

/**
 * Format a stage response into a single dialogue message.
 *
 * Combines the main response text with the follow-up question,
 * separated by a blank line.
 */
export function formatStageResponse(response: StageResponseFields): string {
    return `${response.response_message}\n\n${response.concise_question}`;
}
