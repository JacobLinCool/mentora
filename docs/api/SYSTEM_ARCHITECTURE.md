# Mentora Backend System Architecture

**Version:** 1.0.0  
**Last Updated:** 2026-01-03

## Overview

This document describes the backend system architecture for Mentora, an AI-powered Socratic dialogue platform integrating with Google's Gemini Live API for real-time conversational interactions.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Component Overview](#component-overview)
3. [Data Flow](#data-flow)
4. [Real-Time Streaming Architecture](#real-time-streaming-architecture)
5. [Gemini Live Integration](#gemini-live-integration)
6. [Database Schema](#database-schema)
7. [Security Architecture](#security-architecture)
8. [Cost Management](#cost-management)
9. [Deployment Architecture](#deployment-architecture)

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                       │
├────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│  │   Web App   │  │  Mobile App │  │     CLI     │  │  Third-party APIs   │    │
│  │  (Svelte)   │  │   (Future)  │  │ (mentora-cli│  │   (Future LMS int)  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘    │
└─────────┼────────────────┼────────────────┼────────────────────┼───────────────┘
          │                │                │                    │
          │  HTTPS/WSS     │                │                    │
          ▼                ▼                ▼                    ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            EDGE LAYER (Cloudflare)                              │
├────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  CDN / DDoS Protection / Rate Limiting / WebSocket Termination          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                                      │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    SvelteKit Application (apps/mentora)                  │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐     │   │
│  │  │  Page Routes   │  │   API Routes   │  │   Server Hooks         │     │   │
│  │  │  (SSR Pages)   │  │  (/api/*)      │  │   (Auth, Locale)       │     │   │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │               Streaming Service (Durable Objects / Workers)              │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐     │   │
│  │  │  WebSocket     │  │  Session       │  │   Gemini Live          │     │   │
│  │  │  Manager       │  │  State         │  │   Connection Pool      │     │   │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌─────────────────────────────┐    ┌─────────────────────────────────────────────┐
│       FIREBASE SERVICES      │    │              EXTERNAL SERVICES              │
├─────────────────────────────┤    ├─────────────────────────────────────────────┤
│  ┌───────────────────────┐  │    │  ┌─────────────────────────────────────┐    │
│  │   Firebase Auth       │  │    │  │         Google Gemini Live          │    │
│  │   (Authentication)    │  │    │  │   (Real-time AI Conversations)      │    │
│  └───────────────────────┘  │    │  └─────────────────────────────────────┘    │
│  ┌───────────────────────┐  │    │  ┌─────────────────────────────────────┐    │
│  │   Cloud Firestore     │  │    │  │         Stripe (Payments)           │    │
│  │   (Database)          │  │    │  │   (Credit purchases)                │    │
│  └───────────────────────┘  │    │  └─────────────────────────────────────┘    │
│  ┌───────────────────────┐  │    │  ┌─────────────────────────────────────┐    │
│  │   Cloud Storage       │  │    │  │         SendGrid / FCM              │    │
│  │   (Files/Thumbnails)  │  │    │  │   (Email & Push Notifications)      │    │
│  └───────────────────────┘  │    │  └─────────────────────────────────────┘    │
│  ┌───────────────────────┐  │    │                                             │
│  │   Firebase Analytics  │  │    │                                             │
│  │   (Usage Tracking)    │  │    │                                             │
│  └───────────────────────┘  │    │                                             │
└─────────────────────────────┘    └─────────────────────────────────────────────┘
```

---

## Component Overview

### 1. mentora-api (SDK Package)

**Location:** `packages/mentora-api/`

A TypeScript SDK providing client-side API abstractions for both browser and Node.js environments.

```
packages/mentora-api/
├── src/lib/
│   ├── api/
│   │   ├── types.ts           # Core types (APIResult, MentoraAPIConfig)
│   │   ├── courses.ts         # Course CRUD operations
│   │   ├── assignments.ts     # Assignment management
│   │   ├── conversations.ts   # Conversation operations
│   │   ├── streaming.ts       # WebSocket streaming client (NEW)
│   │   ├── submissions.ts     # Submission handling
│   │   ├── statistics.ts      # Analytics queries (NEW)
│   │   ├── wallets.ts         # Credit management
│   │   └── backend.ts         # Backend API calls
│   └── index.ts               # Public exports
```

### 2. mentora-firebase (Schema Package)

**Location:** `packages/firebase/`

Zod schemas for all Firestore collections, ensuring type safety across client and server.

```
packages/firebase/
├── src/
│   ├── firestore/
│   │   ├── shared.ts          # Common types (timestamps, roles)
│   │   ├── courses.ts         # Course & membership schemas
│   │   ├── assignments.ts     # Assignment schemas
│   │   ├── conversations.ts   # Conversation & turn schemas
│   │   ├── streaming.ts       # Streaming session schemas (NEW)
│   │   ├── submissions.ts     # Submission schemas
│   │   ├── wallets.ts         # Wallet & ledger schemas
│   │   └── aiConfig.ts        # AI persona & strategy schemas (NEW)
│   └── index.ts
```

### 3. mentora-cli (CLI Tool)

**Location:** `packages/mentora-cli/`

Command-line interface for managing courses, conversations, and testing.

```
packages/mentora-cli/
├── src/
│   ├── commands/
│   │   ├── courses.ts
│   │   ├── assignments.ts
│   │   ├── conversations.ts
│   │   ├── streaming.ts       # Interactive streaming (NEW)
│   │   └── wallets.ts
│   └── client.ts              # CLI-specific client
```

### 4. apps/mentora (SvelteKit Application)

**Location:** `apps/mentora/`

The main web application with SSR, API routes, and real-time features.

```
apps/mentora/
├── src/
│   ├── routes/
│   │   ├── api/
│   │   │   ├── courses/
│   │   │   ├── assignments/
│   │   │   ├── conversations/
│   │   │   │   └── [id]/
│   │   │   │       ├── +server.ts       # REST endpoints
│   │   │   │       ├── stream/
│   │   │   │       │   └── +server.ts   # WebSocket upgrade
│   │   │   │       └── turns/
│   │   │   │           └── +server.ts
│   │   │   └── wallets/
│   │   ├── conversations/
│   │   │   └── [id]/
│   │   │       └── +page.svelte         # Conversation UI
│   │   └── ...
│   ├── lib/
│   │   ├── server/
│   │   │   ├── gemini/
│   │   │   │   ├── client.ts            # Gemini Live client (NEW)
│   │   │   │   ├── session.ts           # Session management (NEW)
│   │   │   │   └── strategies.ts        # Dialectical strategies (NEW)
│   │   │   ├── streaming/
│   │   │   │   ├── manager.ts           # WebSocket manager (NEW)
│   │   │   │   └── bridge.ts            # Client-Gemini bridge (NEW)
│   │   │   └── auth.ts                  # Server-side auth
│   │   └── ...
```

---

## Data Flow

### REST API Request Flow

```
┌────────┐    ┌────────────┐    ┌──────────────┐    ┌───────────┐
│ Client │───►│  SvelteKit │───►│  Firestore   │───►│  Response │
│        │    │  API Route │    │  (via SDK)   │    │           │
└────────┘    └────────────┘    └──────────────┘    └───────────┘
     │              │
     │         ┌────┴────┐
     │         │  Auth   │
     │         │  Check  │
     │         └─────────┘
     │
   Firebase
   ID Token
```

### Real-Time Streaming Flow

```
┌────────┐         ┌────────────────┐         ┌──────────────┐
│ Client │◄───────►│ Streaming Svc  │◄───────►│ Gemini Live  │
│  (WS)  │         │  (WS Manager)  │         │    (gRPC)    │
└────────┘         └───────┬────────┘         └──────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │  Firestore   │
                   │  (Persist)   │
                   └──────────────┘
```

---

## Real-Time Streaming Architecture

### WebSocket Connection Lifecycle

```
1. CLIENT CONNECTS
   ├─► Validate auth token
   ├─► Load conversation state
   ├─► Check user permissions
   └─► Establish Gemini Live session

2. STREAMING SESSION
   ├─► Client sends audio/text
   │   ├─► Transcribe (if audio)
   │   ├─► Forward to Gemini
   │   └─► Store user turn
   │
   ├─► Gemini responds (streaming)
   │   ├─► Stream audio/text to client
   │   ├─► Analyze response strategy
   │   └─► Store AI turn
   │
   └─► Update conversation state

3. SESSION END
   ├─► Save final state
   ├─► Calculate token usage
   ├─► Update wallet
   └─► Close connections
```

### Streaming Service Design (Cloudflare Durable Objects)

For persistent WebSocket connections on Cloudflare Workers:

```typescript
// Conceptual Durable Object structure
class ConversationSession {
    state: DurableObjectState;
    clients: Set<WebSocket>;
    geminiSession: GeminiLiveSession | null;

    async handleWebSocket(ws: WebSocket, request: Request) {
        // Validate auth
        // Load or create Gemini session
        // Bridge messages between client and Gemini
    }

    async handleClientMessage(message: ClientMessage) {
        switch (message.type) {
            case "audio_chunk":
                await this.geminiSession.sendAudio(message.data);
                break;
            case "text_input":
                await this.geminiSession.sendText(message.text);
                break;
            case "end_turn":
                await this.processUserTurn();
                break;
        }
    }

    async handleGeminiResponse(response: GeminiResponse) {
        // Stream to all connected clients
        // Persist turns to Firestore
        // Update conversation state
    }
}
```

### Fallback: Server-Sent Events (SSE)

For environments without WebSocket support:

```typescript
// SSE endpoint for streaming responses
export async function GET({ params, request }) {
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Subscribe to Gemini responses
            for await (const chunk of geminiSession.streamResponse()) {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
                );
            }

            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
```

---

## Gemini Live Integration

### Session Configuration

```typescript
interface GeminiSessionConfig {
    // Model settings
    model: "gemini-2.0-flash-exp";

    // Audio config for voice conversations
    audioConfig?: {
        inputSampleRate: 16000;
        outputSampleRate: 24000;
        voice: "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede";
    };

    // System instruction (from assignment config)
    systemInstruction: string;

    // Conversation context
    conversationHistory: Turn[];

    // Safety and termination
    safetySettings: SafetySetting[];
    maxOutputTokens?: number;
}
```

### Dialectical Strategy Implementation

```typescript
class SocraticDialogueManager {
    private strategies: DialecticalStrategy[] = [
        new ClarifyStrategy(),
        new ChallengeStrategy(),
        new DevilsAdvocateStrategy(),
    ];

    async selectStrategy(
        studentTurn: Turn,
        conversationHistory: Turn[],
    ): Promise<StrategySelection> {
        // Analyze student's statement
        const analysis = await this.analyzeStatement(studentTurn.text);

        // Select appropriate strategy
        if (analysis.isVague) {
            return {
                strategy: "clarify",
                prompt: this.buildClarifyPrompt(analysis),
            };
        }

        if (analysis.hasWeakEvidence) {
            return {
                strategy: "challenge",
                prompt: this.buildChallengePrompt(analysis),
            };
        }

        if (analysis.isOneSided) {
            return {
                strategy: "devils_advocate",
                prompt: this.buildDAPrompt(analysis),
            };
        }

        // Default: continue dialogue naturally
        return { strategy: "continue", prompt: null };
    }

    async checkTerminationConditions(
        conversation: Conversation,
    ): Promise<TerminationResult> {
        // Check max turns
        if (conversation.turns.length >= config.maxTurns) {
            return { shouldEnd: true, reason: "max_turns_reached" };
        }

        // Check for conclusion reached
        if (await this.hasReachedConclusion(conversation)) {
            return { shouldEnd: true, reason: "conclusion_reached" };
        }

        // Check for circular arguments
        if (await this.detectCircularArgument(conversation)) {
            return { shouldEnd: true, reason: "circular_argument" };
        }

        return { shouldEnd: false };
    }
}
```

### Response Delay Mode (Async Dialogue)

For assignments requiring deliberation time:

```typescript
class DelayedResponseScheduler {
    async scheduleAIResponse(
        conversationId: string,
        delayHours: number,
    ): Promise<void> {
        // Store pending response in Firestore
        await setDoc(doc(db, "pendingResponses", conversationId), {
            scheduledAt: Date.now() + delayHours * 60 * 60 * 1000,
            status: "pending",
        });

        // Cloud Scheduler or Cloudflare Cron will process these
    }

    async processPendingResponses(): Promise<void> {
        const pending = await getDocs(
            query(
                collection(db, "pendingResponses"),
                where("scheduledAt", "<=", Date.now()),
                where("status", "==", "pending"),
            ),
        );

        for (const doc of pending.docs) {
            await this.generateAndNotify(doc.id);
        }
    }
}
```

---

## Database Schema

### Collections Structure

```
firestore/
├── users/{userId}
│   └── UserProfile
│
├── courses/{courseId}
│   ├── CourseDoc
│   └── roster/{memberId}
│       └── CourseMembership
│
├── topics/{topicId}
│   └── TopicDoc
│
├── assignments/{assignmentId}
│   └── AssignmentDoc (includes AIConfig)
│
├── conversations/{conversationId}
│   └── ConversationDoc
│       ├── turns: Turn[]  (embedded)
│       └── streamingSession?: StreamingSessionRef
│
├── submissions/{submissionId}
│   └── SubmissionDoc
│
├── wallets/{walletId}
│   └── WalletDoc
│       └── ledger/{entryId}
│           └── LedgerEntry
│
├── streamingSessions/{sessionId}    (NEW - ephemeral)
│   └── StreamingSessionDoc
│
└── statistics/{assignmentId}        (NEW - aggregated)
    └── AssignmentStatistics
```

### New Schemas

#### AI Configuration

```typescript
// In packages/firebase/src/firestore/aiConfig.ts
export const zAIPersona = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    voice: z.enum(["Puck", "Charon", "Kore", "Fenrir", "Aoede"]).optional(),
    style: z.enum(["gentle", "critical", "analytical", "playful"]),
    systemPromptTemplate: z.string(),
});

export const zDialecticalConfig = z.object({
    enabledStrategies: z.array(
        z.enum(["clarify", "challenge", "devils_advocate"]),
    ),
    strategyWeights: z.record(z.number()).optional(),
    customPrompts: z.record(z.string()).optional(),
});

export const zAssignmentAIConfig = z.object({
    persona: z.string().default("socratic-default"),
    customSystemPrompt: z.string().optional(),
    dialecticalConfig: zDialecticalConfig,
    maxTurns: z.number().int().positive().default(20),
    autoTerminate: z.boolean().default(true),
    responseDelayHours: z.number().nonnegative().default(0),
    allowStudentPromptEdit: z.boolean().default(false),
    lockedPromptSections: z.array(z.string()).optional(),
});
```

#### Streaming Session

```typescript
// In packages/firebase/src/firestore/streaming.ts
export const zStreamingSessionState = z.enum([
    "connecting",
    "active",
    "user_speaking",
    "ai_responding",
    "paused",
    "error",
    "closed",
]);

export const zStreamingSession = z.object({
    id: z.string(),
    conversationId: z.string(),
    userId: z.string(),
    state: zStreamingSessionState,
    geminiSessionId: z.string().nullable(),
    audioConfig: z
        .object({
            inputSampleRate: z.number(),
            outputSampleRate: z.number(),
            voice: z.string(),
        })
        .optional(),
    tokenUsage: z.object({
        input: z.number(),
        output: z.number(),
        estimatedCost: z.number(),
    }),
    startedAt: zFirebaseTimestamp,
    lastActivityAt: zFirebaseTimestamp,
    endedAt: zFirebaseTimestamp.nullable(),
});
```

---

## Security Architecture

### Authentication Flow

```
┌────────┐    ┌────────────┐    ┌──────────────┐
│ Client │───►│  Firebase  │───►│  ID Token    │
│        │    │   Auth     │    │  (JWT)       │
└────────┘    └────────────┘    └──────┬───────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │  API Route   │
                               │  Middleware  │
                               └──────┬───────┘
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                 ┌──────────────┐         ┌──────────────┐
                 │ Admin SDK    │         │ Firestore    │
                 │ Token Verify │         │ Security     │
                 └──────────────┘         │ Rules        │
                                          └──────────────┘
```

### Authorization Layers

1. **Firebase Auth**: User identity
2. **Firestore Rules**: Data access control
3. **API Middleware**: Request validation
4. **Application Logic**: Business rules

### Firestore Security Rules (Key Rules)

```javascript
// Conversation access
match /conversations/{conversationId} {
  allow read: if isOwner() || isCourseInstructor();
  allow create: if isAuthenticated()
                && isEnrolledInCourse()
                && request.resource.data.userId == request.auth.uid;
  allow update: if isOwner()
                && validConversationUpdate();
}

// Streaming session (ephemeral)
match /streamingSessions/{sessionId} {
  allow read, write: if isOwner();
}
```

---

## Cost Management

### Token Tracking

```typescript
interface TokenTracker {
  // Track token usage per turn
  async recordTurnUsage(
    conversationId: string,
    turnId: string,
    usage: TokenUsage
  ): Promise<void>;

  // Calculate cost based on model and tokens
  calculateCost(usage: TokenUsage): number;

  // Deduct from appropriate wallet
  async deductCost(
    conversationId: string,
    cost: number
  ): Promise<DeductionResult>;
}
```

### Credit System

```
┌─────────────────────────────────────────────────────┐
│                   CREDIT FLOW                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Host Pays Mode:                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │  Course  │───►│  Student │───►│ Conversation │   │
│  │  Wallet  │    │  Usage   │    │   Cost       │   │
│  └──────────┘    └──────────┘    └──────────────┘   │
│                                                      │
│  User Pays Mode (Auditor):                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │  User    │───►│  Usage   │───►│ Conversation │   │
│  │  Wallet  │    │          │    │   Cost       │   │
│  └──────────┘    └──────────┘    └──────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Pre-Check Before Streaming

```typescript
async function checkCredits(
    userId: string,
    assignmentId: string,
): Promise<CreditCheckResult> {
    const assignment = await getAssignment(assignmentId);
    const course = await getCourse(assignment.courseId);
    const membership = await getMembership(course.id, userId);

    // Determine payment source
    const walletId =
        membership.role === "auditor"
            ? userId // User's own wallet
            : course.id; // Course wallet (host pays)

    const wallet = await getWallet(walletId);
    const estimatedCost = MINIMUM_CONVERSATION_COST;

    if (wallet.balance < estimatedCost) {
        return {
            allowed: false,
            reason: "INSUFFICIENT_CREDITS",
            required: estimatedCost,
            available: wallet.balance,
        };
    }

    return { allowed: true, walletId };
}
```

---

## Deployment Architecture

### Cloudflare Workers + Durable Objects

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Worker (Main)                          │   │
│  │  - Static assets                                          │   │
│  │  - SSR pages                                              │   │
│  │  - REST API routes                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           │ Durable Object Stub                  │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Durable Objects (per conversation)           │   │
│  │  - WebSocket handling                                     │   │
│  │  - Gemini Live session                                    │   │
│  │  - State persistence                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables

```bash
# Firebase
FIREBASE_PROJECT_ID=mentora-prod
FIREBASE_API_KEY=...
FIREBASE_SERVICE_ACCOUNT_KEY=...

# Gemini
GEMINI_API_KEY=...
GEMINI_PROJECT_ID=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Notifications
SENDGRID_API_KEY=...
FCM_SERVER_KEY=...
```

---

## Monitoring & Observability

### Metrics to Track

1. **API Latency**: Response times per endpoint
2. **WebSocket Connections**: Active connections, connection duration
3. **Gemini API**: Token usage, latency, error rates
4. **Firestore**: Read/write operations, document counts
5. **Credit Usage**: Consumption rate, low balance alerts

### Logging Strategy

```typescript
// Structured logging for debugging
logger.info("conversation.turn.added", {
    conversationId,
    turnId,
    userId,
    turnType: "user",
    tokenCount: usage.input,
    duration: endTime - startTime,
});

logger.info("gemini.response.streamed", {
    conversationId,
    strategy: selectedStrategy,
    tokenCount: usage.output,
    streamDuration,
    chunkCount,
});
```

---

## Changelog

| Version | Date       | Changes                       |
| ------- | ---------- | ----------------------------- |
| 1.0.0   | 2026-01-03 | Initial architecture document |
