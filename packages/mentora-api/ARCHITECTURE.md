# Hybrid Firestore Access Architecture

This document describes the hybrid architecture for data access in Mentora.

## Overview

The architecture uses two access modes:

1. **Direct Access**: Simple CRUD operations via Firestore SDK
2. **Delegated Access**: Complex operations via Backend API

## Key Principles

### 1. Unified Interface

All operations are exposed through `MentoraClient` / `MentoraAPI`. The frontend never directly accesses Firestore or makes raw API calls - it always goes through the unified interface.

### 2. Security

- Direct Firestore access is protected by Security Rules
- Backend endpoints verify authentication via Firebase ID tokens
- The client is responsible for storing data to ensure rules are enforced

### 3. Backend Responsibilities

The backend does NOT directly manipulate Firebase. It:

- Processes complex logic (LLM calls, analysis)
- Returns data to the client
- The client stores results via direct Firestore access

**Exception**: Backend CREATE operations (POST) that require server-side validation (e.g., checking course code uniqueness) write directly to Firestore, but still use Security Rules.

## Access Mode Decision Matrix

| Operation            | Access Mode   | Reason                              |
| -------------------- | ------------- | ----------------------------------- |
| Get user profile     | Direct        | Simple read, security via rules     |
| Update user profile  | Direct        | Simple update, security via rules   |
| Get course           | Direct        | Simple read                         |
| List my courses      | Direct        | Simple query with auth              |
| Create course        | Delegated     | Needs code uniqueness validation    |
| Update course        | Direct        | Simple update, security via rules   |
| Delete course        | Direct        | Simple delete, security via rules   |
| Join course by code  | **Delegated** | Needs validation, password handling |
| Get topic            | Direct        | Simple read                         |
| List topics          | Direct        | Simple query                        |
| Create topic         | Delegated     | Needs order calculation             |
| CRUD topics          | Direct        | Simple operations                   |
| Get assignment       | Direct        | Simple read                         |
| List assignments     | Direct        | Simple query                        |
| Create assignment    | Delegated     | Needs permission validation         |
| CRUD assignments     | Direct        | Simple operations                   |
| Get submission       | Direct        | Simple read                         |
| Start/submit work    | Direct        | State updates                       |
| Grade submission     | Direct        | Instructor updates                  |
| Get conversation     | Direct        | Simple read                         |
| Create conversation  | **Delegated** | Needs validation, timing checks     |
| End conversation     | **Delegated** | Needs finalization logic            |
| Stream message       | **Delegated** | LLM integration                     |
| Submit message       | **Delegated** | LLM integration                     |
| Analyze conversation | **Delegated** | LLM integration                     |
| Generate summary     | **Delegated** | LLM integration                     |
| Transcribe audio     | **Delegated** | Speech-to-text                      |
| Synthesize speech    | **Delegated** | Text-to-speech                      |
| Get wallet           | Direct        | Simple read                         |
| List ledger entries  | Direct        | Simple query                        |
| Add credits          | **Delegated** | Needs idempotency, wallet creation  |

## Backend Endpoints

### Required (Complex Logic / LLM / Validation)

| Endpoint                          | Method        | Purpose                               |
| --------------------------------- | ------------- | ------------------------------------- |
| `/api/courses`                    | POST          | Create course with code validation    |
| `/api/courses/join`               | POST          | Join course with code validation      |
| `/api/courses/[id]/roster`        | POST          | Invite members to course              |
| `/api/courses/[id]/topics`        | POST          | Create topic with order calculation   |
| `/api/assignments`                | POST          | Create assignment with validation     |
| `/api/assignments/[id]`           | PATCH, DELETE | Update/delete assignment              |
| `/api/conversations`              | POST          | Create conversation with validation   |
| `/api/conversations/[id]/end`     | POST          | End conversation, finalize submission |
| `/api/conversations/[id]/stream`  | POST          | SSE streaming LLM response            |
| `/api/conversations/[id]/message` | POST          | Non-streaming LLM response            |
| `/api/conversations/[id]/analyze` | POST          | LLM-based analysis                    |
| `/api/conversations/[id]/summary` | GET           | LLM-generated summary                 |
| `/api/voice/transcribe`           | POST          | Speech-to-text                        |
| `/api/voice/synthesize`           | POST          | Text-to-speech                        |
| `/api/wallets/me/credits`         | POST          | Add credits to wallet                 |

### Removed (Now Direct Firestore Access)

The following endpoints have been removed. Use `mentora-api` package instead:

| Removed Endpoint               | Replacement                                                          |
| ------------------------------ | -------------------------------------------------------------------- |
| `GET /api/courses`             | `client.courses.listMine()` / `listEnrolled()` / `listAllEnrolled()` |
| `GET /api/courses/[id]`        | `client.courses.get(courseId)`                                       |
| `GET /api/courses/[id]/roster` | `client.courses.getRoster(courseId)`                                 |
| `GET /api/courses/[id]/topics` | `client.topics.listForCourse(courseId)`                              |
| `GET /api/topics/[id]`         | `client.topics.get(topicId)`                                         |
| `GET /api/assignments`         | `client.assignments.listForCourse(courseId)`                         |
| `GET /api/assignments/[id]`    | `client.assignments.get(assignmentId)`                               |
| `GET /api/conversations`       | Direct query via Firestore                                           |
| `GET /api/conversations/[id]`  | `client.conversations.get(conversationId)`                           |
| `GET /api/wallets/me`          | `client.wallets.getMine()`                                           |

## Real-time Subscriptions

For real-time updates, use the subscription methods from `mentora-api/access/subscriptions`:

```typescript
import { subscribeToConversation } from 'mentora-api';

// Subscribe to conversation updates
const unsubscribe = subscribeToConversation(ctx, conversationId, {
	onData: (conversation) => {
		// Update UI with new data
	},
	onError: (error) => {
		console.error('Subscription error:', error);
	},
	onLoading: (loading) => {
		// Show loading state
	}
});

// Later: clean up
unsubscribe();
```

## File Structure

```
packages/mentora-api/src/lib/api/
├── access/
│   ├── index.ts         # Access layer exports
│   ├── types.ts         # Access layer types
│   ├── direct.ts        # Firestore SDK operations
│   ├── delegated.ts     # Backend API calls
│   └── subscriptions.ts # Real-time subscriptions
├── client.ts            # Main MentoraClient class
├── types.ts             # Core types (APIResult, etc.)
└── [modules]            # Domain modules (courses, topics, etc.)
```

## LLM Endpoints (Mock Implementation)

The following endpoints currently return mock data and need LLM/voice service integration:

- `POST /api/conversations/[id]/message` - TODO: Integrate with LLM service
- `POST /api/conversations/[id]/stream` - TODO: Integrate with LLM service
- `POST /api/conversations/[id]/analyze` - TODO: Integrate with LLM service
- `GET /api/conversations/[id]/summary` - TODO: Integrate with LLM service
- `POST /api/voice/transcribe` - TODO: Integrate with speech-to-text
- `POST /api/voice/synthesize` - TODO: Integrate with text-to-speech

## Migration Guide

### For Frontend Code

Before (using backend API):

```typescript
const response = await fetch('/api/courses');
const courses = await response.json();
```

After (using mentora-api):

```typescript
import { api } from '$lib/api';

const result = await api.courses.listMine();
if (result.success) {
	const courses = result.data;
}
```

### For Real-time Data

Before (polling):

```typescript
setInterval(async () => {
	const response = await fetch(`/api/conversations/${id}`);
	// ...
}, 5000);
```

After (subscription):

```typescript
import { api } from '$lib/api';

const state = api.createState<Conversation>();
api.conversationsSubscribe.subscribe(conversationId, state);

// state.value automatically updates when data changes
```
