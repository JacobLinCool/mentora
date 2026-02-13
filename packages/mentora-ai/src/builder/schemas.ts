/**
 * Shared Zod schemas and constants for AI stage builders.
 * Single source of truth for guardrail values used across all dialogue stages.
 */

import { z } from "zod";

/**
 * Confidence score schema: 0.0 – 1.0 range, used by all stage classifiers.
 */
export const confidenceScoreSchema = z
    .number()
    .min(0)
    .max(1)
    .describe("信心分數 (0.0 - 1.0)");

/**
 * Description string shared by all detected_intent / trigger fields.
 */
export const TRIGGER_DESCRIPTION = "對應狀態轉移表中的 Trigger ID";

/**
 * Initial confidence value assigned when a stance is first established.
 */
export const INITIAL_CONFIDENCE = 1.0;
