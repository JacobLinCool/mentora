import { z } from "zod";

/**
 * AI Persona styles for Socratic dialogue
 */
export const zAIPersonaStyle = z
    .union([
        z.literal("gentle").describe("Warm and encouraging approach"),
        z.literal("critical").describe("Rigorous and challenging approach"),
        z.literal("analytical").describe("Data-driven and logical approach"),
        z
            .literal("playful")
            .describe("Engaging and thought-provoking approach"),
    ])
    .describe("The interaction style for the AI mentor.");
export type AIPersonaStyle = z.infer<typeof zAIPersonaStyle>;

/**
 * Available AI voice options for Gemini Live
 */
export const zAIVoice = z
    .union([
        z.literal("Puck"),
        z.literal("Charon"),
        z.literal("Kore"),
        z.literal("Fenrir"),
        z.literal("Aoede"),
    ])
    .describe("Voice preset for audio responses.");
export type AIVoice = z.infer<typeof zAIVoice>;

/**
 * AI Persona definition for customizing mentor behavior
 */
export const zAIPersona = z
    .object({
        id: z.string().max(64).describe("Unique identifier for the persona."),
        name: z
            .string()
            .min(1)
            .max(100)
            .describe("Display name for the persona."),
        description: z
            .string()
            .max(500)
            .describe("Description of the persona's approach."),
        voice: zAIVoice
            .optional()
            .describe("Voice preset for audio responses."),
        style: zAIPersonaStyle.describe("Interaction style of the persona."),
        systemPromptTemplate: z
            .string()
            .max(10000)
            .describe("System prompt template with placeholders."),
    })
    .describe("AI Persona configuration for customizing mentor behavior.");
export type AIPersona = z.infer<typeof zAIPersona>;

/**
 * Dialectical strategy types for Socratic dialogue
 */
export const zDialecticalStrategy = z
    .union([
        z.literal("clarify").describe("Ask for clarification on vague points"),
        z.literal("challenge").describe("Challenge weak evidence or logic"),
        z.literal("devils_advocate").describe("Present opposing viewpoint"),
        z.literal("summarize").describe("Summarize the discussion so far"),
        z.literal("deepen").describe("Dig deeper into a specific point"),
        z.literal("conclude").describe("Guide toward conclusion"),
    ])
    .describe("Strategy type for Socratic dialogue.");
export type DialecticalStrategy = z.infer<typeof zDialecticalStrategy>;

/**
 * Configuration for dialectical strategies
 */
export const zDialecticalConfig = z
    .object({
        enabledStrategies: z
            .array(zDialecticalStrategy)
            .min(1)
            .default(["clarify", "challenge", "devils_advocate"])
            .describe("Strategies available for use in dialogue."),
        strategyWeights: z
            .record(z.string(), z.number().min(0).max(1))
            .optional()
            .describe("Optional weights for strategy selection (0-1)."),
        customPrompts: z
            .record(z.string(), z.string().max(2000))
            .optional()
            .describe("Custom prompts per strategy to override defaults."),
    })
    .describe("Configuration for dialectical strategy selection.");
export type DialecticalConfig = z.infer<typeof zDialecticalConfig>;

/**
 * Auto-termination conditions for conversations
 */
export const zTerminationCondition = z
    .union([
        z.literal("max_turns_reached"),
        z.literal("student_reached_conclusion"),
        z.literal("circular_argument_detected"),
        z.literal("student_requested_end"),
        z.literal("time_limit_exceeded"),
        z.literal("instructor_ended"),
    ])
    .describe("Condition that can trigger conversation termination.");
export type TerminationCondition = z.infer<typeof zTerminationCondition>;

/**
 * Auto-termination configuration
 */
export const zAutoTerminationConfig = z
    .object({
        enabled: z
            .boolean()
            .default(true)
            .describe("Whether auto-termination is enabled."),
        conditions: z
            .array(zTerminationCondition)
            .default([
                "max_turns_reached",
                "student_reached_conclusion",
                "circular_argument_detected",
            ])
            .describe("Conditions that trigger auto-termination."),
        maxTurnsBeforeWarning: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Turns before warning about approaching limit."),
    })
    .describe("Configuration for automatic conversation termination.");
export type AutoTerminationConfig = z.infer<typeof zAutoTerminationConfig>;

/**
 * AI configuration for assignments
 */
export const zAssignmentAIConfig = z
    .object({
        persona: z
            .string()
            .default("socratic-default")
            .describe("ID of the persona to use."),
        customSystemPrompt: z
            .string()
            .max(15000)
            .optional()
            .describe("Optional custom system prompt override."),
        dialecticalConfig: zDialecticalConfig
            .optional()
            .describe("Dialectical strategy configuration."),
        maxTurns: z
            .number()
            .int()
            .positive()
            .default(20)
            .describe("Maximum number of turns in a conversation."),
        autoTermination: zAutoTerminationConfig
            .optional()
            .describe("Auto-termination configuration."),
        responseDelayHours: z
            .number()
            .nonnegative()
            .default(0)
            .describe("Hours to delay AI response (0 for instant)."),
        allowStudentPromptEdit: z
            .boolean()
            .default(false)
            .describe("Whether students can modify the prompt."),
        lockedPromptSections: z
            .array(z.string().max(100))
            .optional()
            .describe("Prompt sections that cannot be modified."),
        voiceEnabled: z
            .boolean()
            .default(false)
            .describe("Whether voice conversation is enabled."),
        voice: zAIVoice
            .optional()
            .describe("Voice to use for audio responses."),
    })
    .describe("AI configuration for an assignment.");
export type AssignmentAIConfig = z.infer<typeof zAssignmentAIConfig>;

/**
 * Default personas available in the system
 */
export const DEFAULT_PERSONAS: AIPersona[] = [
    {
        id: "socratic-default",
        name: "Socratic Guide",
        description:
            "A balanced approach using classic Socratic questioning to guide students toward deeper understanding.",
        style: "gentle",
        systemPromptTemplate: `You are a Socratic tutor engaging in thoughtful dialogue with a student. Your role is to:

1. Never provide direct answers or solutions
2. Ask probing questions to help the student discover insights themselves
3. Challenge assumptions gently but persistently
4. Acknowledge good thinking while pushing for deeper analysis
5. Use the dialectical strategies: clarify, challenge, and play devil's advocate as appropriate

Topic: {{topic}}
Assignment: {{assignment_prompt}}

Remember: Your goal is to develop the student's critical thinking, not to lecture or teach directly.`,
    },
    {
        id: "socratic-gentle",
        name: "Gentle Guide",
        description:
            "A warm and encouraging mentor who creates a safe space for exploration.",
        style: "gentle",
        voice: "Kore",
        systemPromptTemplate: `You are a warm and encouraging Socratic tutor. Your approach is:

1. Create a psychologically safe environment for intellectual exploration
2. Celebrate effort and progress in thinking
3. Gently probe without making the student feel criticized
4. Use affirming language while still pushing for deeper thought
5. Build confidence through the discovery process

Topic: {{topic}}
Assignment: {{assignment_prompt}}

Your tone should feel like a supportive conversation with a wise friend.`,
    },
    {
        id: "socratic-critical",
        name: "Critical Examiner",
        description:
            "A rigorous examiner who demands precision and strong evidence.",
        style: "critical",
        voice: "Fenrir",
        systemPromptTemplate: `You are a rigorous Socratic examiner. Your approach is:

1. Demand precise definitions and clear reasoning
2. Identify logical fallacies and weak arguments immediately
3. Push back firmly on unsupported claims
4. Require evidence and examples for assertions
5. Accept nothing at face value

Topic: {{topic}}
Assignment: {{assignment_prompt}}

Be demanding but fair. The goal is intellectual rigor, not intimidation.`,
    },
    {
        id: "socratic-analytical",
        name: "Analytical Mentor",
        description:
            "A data-driven mentor who focuses on logic, evidence, and structured thinking.",
        style: "analytical",
        voice: "Charon",
        systemPromptTemplate: `You are an analytical Socratic tutor. Your approach is:

1. Focus on logical structure and valid reasoning
2. Ask for data, evidence, and concrete examples
3. Help students break down complex issues into components
4. Use structured frameworks for analysis
5. Encourage systematic thinking over intuition

Topic: {{topic}}
Assignment: {{assignment_prompt}}

Guide the student through methodical analysis of the topic.`,
    },
];
