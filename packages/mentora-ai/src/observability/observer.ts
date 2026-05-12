import type { TokenUsage } from "../types.js";

export type SpanAttrs = Record<
    string,
    string | number | boolean | null | undefined
>;

export interface GenerationStart {
    model: string;
    input?: unknown;
    metadata?: SpanAttrs;
}

export interface LLMGeneration {
    end(opts: {
        output?: unknown;
        usage?: TokenUsage;
        model?: string;
        error?: unknown;
    }): void;
}

export interface LLMSpan {
    child(name: string, attrs?: SpanAttrs): LLMSpan;
    generation(name: string, opts: GenerationStart): LLMGeneration;
    setAttributes(attrs: SpanAttrs): void;
    /** Set meaningful trace-readable input/output on this span (e.g. user message / AI reply). */
    setIO(io: { input?: unknown; output?: unknown }): void;
    end(opts?: { error?: unknown; output?: unknown }): void;
}

export interface LLMObserver {
    startSpan(name: string, attrs?: SpanAttrs): LLMSpan;
}

const NoopGeneration: LLMGeneration = {
    end: () => {},
};

const NoopSpan: LLMSpan = {
    child: () => NoopSpan,
    generation: () => NoopGeneration,
    setAttributes: () => {},
    setIO: () => {},
    end: () => {},
};

export const NoopObserver: LLMObserver = {
    startSpan: () => NoopSpan,
};
