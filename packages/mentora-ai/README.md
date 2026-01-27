# Mentora AI

The **Mentora AI** package provides the core AI pipeline for Mentora's Socratic dialogue system. It includes prompt builders, executors, and an orchestrator for managing multi-stage ethical reasoning conversations.

## Architecture

The package is organized into three main modules:

- **Builder** - Prompt builders for each dialogue stage
- **Executor** - LLM execution adapters (currently Gemini)
- **Orchestrator** - State management and stage transitions

## Dialogue Stages

| Stage                   | Description                       | Decisions                                                           |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------- |
| S1: Asking Stance       | Elicit student's initial position | `clarify`, `confirm_stance`                                         |
| S2: Case Challenge      | Present ethical dilemmas          | `clarify`, `scaffold`, `continue_challenge`, `advance_to_principle` |
| S3: Principle Reasoning | Extract underlying principles     | `clarify`, `scaffold`, `loop_to_stage2`, `advance_to_closure`       |
| S4: Closure             | Summarize and confirm             | `clarify`, `confirm_end`                                            |

## Usage

```typescript
import { GoogleGenAI } from "@google/genai";
import {
    GeminiPromptExecutor,
    MentoraOrchestrator,
    DefaultStageHandlerRegistry,
} from "mentora-ai";

const genai = new GoogleGenAI({});
const executor = new GeminiPromptExecutor(genai, "gemini-2.5-flash-lite");
const registry = new DefaultStageHandlerRegistry();
const orchestrator = new MentoraOrchestrator(executor, registry);

// Start a conversation
const state = await orchestrator.start("白帽駭客是否需要黑帽駭客的存在？");

// Process student responses
const newState = await orchestrator.step(state, "我認為需要，因為...");
```

## Development

Install dependencies:

```sh
pnpm i
```

Build the package:

```sh
pnpm build
```

## Testing

Run tests with LLM execution:

```sh
TEST_MODEL=gemini-2.5-flash-lite pnpm test
```
