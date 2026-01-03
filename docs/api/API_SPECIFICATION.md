# Mentora API Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-03

## Overview

Mentora is an AI-powered Socratic dialogue platform. This specification defines the REST and WebSocket APIs for course management, assignments, real-time conversations with Gemini Live, and analytics.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Base URLs](#base-urls)
3. [Error Handling](#error-handling)
4. [REST API Endpoints](#rest-api-endpoints)
    - [Courses](#courses)
    - [Topics](#topics)
    - [Assignments](#assignments)
    - [Conversations](#conversations)
    - [Submissions](#submissions)
    - [Statistics](#statistics)
    - [Wallets & Credits](#wallets--credits)
5. [WebSocket API](#websocket-api)
    - [Streaming Conversation](#streaming-conversation)
6. [Gemini Live Integration](#gemini-live-integration)

---

## Authentication

All API requests require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### Token Refresh

Clients should handle `401 Unauthorized` responses by refreshing the ID token and retrying the request.

---

## Base URLs

| Environment | URL                         |
| ----------- | --------------------------- |
| Production  | `https://mentora.app/api`   |
| Development | `http://localhost:5173/api` |

---

## Error Handling

All errors return a consistent JSON structure:

```json
{
    "success": false,
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "details": {}
    }
}
```

### Error Codes

| Code                   | HTTP Status | Description                       |
| ---------------------- | ----------- | --------------------------------- |
| `UNAUTHORIZED`         | 401         | Missing or invalid authentication |
| `FORBIDDEN`            | 403         | Insufficient permissions          |
| `NOT_FOUND`            | 404         | Resource not found                |
| `VALIDATION_ERROR`     | 400         | Request validation failed         |
| `RATE_LIMITED`         | 429         | Too many requests                 |
| `INSUFFICIENT_CREDITS` | 402         | Not enough credits for operation  |
| `CONVERSATION_CLOSED`  | 409         | Conversation already ended        |
| `INTERNAL_ERROR`       | 500         | Server error                      |

---

## REST API Endpoints

### Courses

#### Create Course

```http
POST /api/courses
```

**Request Body:**

```json
{
  "title": "Critical Thinking 101",
  "code": "CT101-2026",
  "visibility": "public" | "unlisted" | "private",
  "password": "optional-for-private",
  "theme": "Philosophy",
  "description": "A course on Socratic dialogue...",
  "isDemo": false,
  "demoPolicy": {
    "maxFreeCreditsPerUser": 1.0,
    "maxTurnsPerConversation": 20
  }
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "course_abc123",
    "title": "Critical Thinking 101",
    ...
  }
}
```

#### Get Course

```http
GET /api/courses/:courseId
```

#### List Courses

```http
GET /api/courses?visibility=public&limit=20&cursor=...
```

#### Update Course

```http
PATCH /api/courses/:courseId
```

#### Delete Course

```http
DELETE /api/courses/:courseId
```

#### Join Course by Code

```http
POST /api/courses/join
```

**Request Body:**

```json
{
    "code": "CT101-2026",
    "password": "optional-for-private"
}
```

#### Get Course Roster

```http
GET /api/courses/:courseId/roster
```

#### Update Member Role

```http
PATCH /api/courses/:courseId/roster/:memberId
```

---

### Topics

#### Create Topic

```http
POST /api/courses/:courseId/topics
```

**Request Body:**

```json
{
    "title": "Week 1: Introduction to Logic",
    "description": "Exploring basic logical fallacies",
    "order": 1
}
```

#### List Topics

```http
GET /api/courses/:courseId/topics
```

#### Update Topic

```http
PATCH /api/topics/:topicId
```

#### Delete Topic

```http
DELETE /api/topics/:topicId
```

---

### Assignments

#### Create Assignment

```http
POST /api/assignments
```

**Request Body:**

```json
{
    "courseId": "course_abc123",
    "topicId": "topic_xyz789",
    "title": "Should social media be regulated?",
    "prompt": "Full assignment prompt with Socratic dialogue instructions...",
    "type": "conversation",
    "mode": "instant",
    "startAt": 1704067200000,
    "dueAt": 1704672000000,
    "allowLate": true,
    "allowResubmit": false,
    "aiConfig": {
        "persona": "socratic-gentle",
        "systemPrompt": "You are a Socratic tutor...",
        "maxTurns": 20,
        "autoTerminate": true,
        "responseDelay": 0,
        "allowStudentPromptEdit": false
    },
    "references": [
        {
            "type": "link",
            "title": "Reading: Mill's On Liberty",
            "url": "https://..."
        }
    ],
    "reminders": [{ "daysBeforeDue": 7 }, { "daysBeforeDue": 1 }]
}
```

#### Get Assignment

```http
GET /api/assignments/:assignmentId
```

#### List Assignments

```http
GET /api/assignments?courseId=...&topicId=...&status=active
```

#### Update Assignment

```http
PATCH /api/assignments/:assignmentId
```

#### Delete Assignment

```http
DELETE /api/assignments/:assignmentId
```

#### Preview AI Response

```http
POST /api/assignments/:assignmentId/preview
```

**Request Body:**

```json
{
    "testMessage": "I think free speech should have limits..."
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "response": "Interesting perspective. What criteria would you use...",
        "strategy": "clarify",
        "estimatedTokens": 150
    }
}
```

---

### Conversations

#### Start Conversation

```http
POST /api/conversations
```

**Request Body:**

```json
{
    "assignmentId": "assignment_123"
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": "conv_abc123",
        "assignmentId": "assignment_123",
        "userId": "user_xyz",
        "state": "awaiting_idea",
        "turns": [],
        "streamingUrl": "wss://mentora.app/api/conversations/conv_abc123/stream"
    }
}
```

#### Get Conversation

```http
GET /api/conversations/:conversationId
```

#### List User Conversations

```http
GET /api/conversations?assignmentId=...
```

#### Add Turn (Non-Streaming)

```http
POST /api/conversations/:conversationId/turns
```

**Request Body:**

```json
{
    "text": "I believe that...",
    "type": "idea"
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "userTurn": {
            "id": "turn_001",
            "type": "idea",
            "text": "I believe that...",
            "createdAt": 1704067200000
        },
        "aiTurn": {
            "id": "turn_002",
            "type": "counterpoint",
            "text": "That's an interesting point, but have you considered...",
            "analysis": {
                "stance": "pro-weak",
                "strategy": "challenge"
            },
            "createdAt": 1704067205000
        },
        "state": "awaiting_followup"
    }
}
```

#### End Conversation

```http
POST /api/conversations/:conversationId/end
```

#### Get Conversation Summary

```http
GET /api/conversations/:conversationId/summary
```

---

### Submissions

#### Get Submission

```http
GET /api/submissions/:submissionId
```

#### List Assignment Submissions (Instructor)

```http
GET /api/assignments/:assignmentId/submissions
```

---

### Statistics

#### Get Assignment Statistics

```http
GET /api/assignments/:assignmentId/statistics
```

**Response:**

```json
{
    "success": true,
    "data": {
        "totalStudents": 30,
        "completed": 25,
        "inProgress": 3,
        "notStarted": 2,
        "stanceDistribution": {
            "initial": {
                "pro": 15,
                "con": 8,
                "neutral": 7
            },
            "final": {
                "pro": 12,
                "con": 10,
                "neutral": 8
            }
        },
        "stanceShifts": [
            { "from": "pro", "to": "con", "count": 5 },
            { "from": "con", "to": "pro", "count": 2 }
        ],
        "wordCloud": {
            "pro": [
                { "word": "freedom", "count": 15, "users": ["user1", "user2"] }
            ],
            "con": [{ "word": "regulation", "count": 12, "users": ["user3"] }]
        },
        "averageTurns": 8.5,
        "averageDuration": 1200000
    }
}
```

#### Export Statistics CSV

```http
GET /api/assignments/:assignmentId/statistics/export
```

---

### Wallets & Credits

#### Get Wallet

```http
GET /api/wallets/me
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": "wallet_abc123",
        "userId": "user_xyz",
        "balance": 5.5,
        "currency": "USD",
        "ledger": [
            {
                "id": "entry_001",
                "type": "credit",
                "amount": 10.0,
                "description": "Initial deposit",
                "createdAt": 1704000000000
            },
            {
                "id": "entry_002",
                "type": "debit",
                "amount": 0.05,
                "description": "Conversation conv_abc123 - 500 tokens",
                "conversationId": "conv_abc123",
                "createdAt": 1704067200000
            }
        ]
    }
}
```

#### Add Credits

```http
POST /api/wallets/me/credits
```

**Request Body:**

```json
{
    "amount": 10.0,
    "paymentMethodId": "pm_..."
}
```

#### Get Course Wallet (Host)

```http
GET /api/courses/:courseId/wallet
```

---

## WebSocket API

### Streaming Conversation

For real-time Socratic dialogue with Gemini Live, use the WebSocket connection:

```
wss://mentora.app/api/conversations/:conversationId/stream
```

#### Connection

1. Connect with auth token as query parameter or in first message
2. Server validates authentication and conversation ownership
3. Bidirectional streaming begins

#### Client Messages

**Start Streaming Audio**

```json
{
    "type": "audio_start",
    "config": {
        "sampleRate": 16000,
        "encoding": "pcm",
        "channels": 1
    }
}
```

**Audio Chunk**

```json
{
    "type": "audio_chunk",
    "data": "<base64-encoded-audio>"
}
```

**Text Input**

```json
{
    "type": "text_input",
    "text": "I think that freedom of speech should..."
}
```

**End Turn**

```json
{
    "type": "end_turn"
}
```

**Stop Streaming**

```json
{
    "type": "stop"
}
```

#### Server Messages

**Connection Established**

```json
{
    "type": "connected",
    "conversationId": "conv_abc123",
    "state": "awaiting_idea"
}
```

**Transcription Update**

```json
{
    "type": "transcription",
    "text": "I think that freedom...",
    "isFinal": false
}
```

**AI Response Start**

```json
{
    "type": "ai_response_start",
    "strategy": "challenge"
}
```

**AI Audio Chunk**

```json
{
    "type": "ai_audio_chunk",
    "data": "<base64-encoded-audio>"
}
```

**AI Text Chunk**

```json
{
    "type": "ai_text_chunk",
    "text": "That's an interesting perspective, but "
}
```

**AI Response End**

```json
{
    "type": "ai_response_end",
    "turn": {
        "id": "turn_002",
        "type": "counterpoint",
        "text": "Full response text...",
        "analysis": {
            "stance": "pro-weak",
            "strategy": "challenge"
        }
    }
}
```

**State Change**

```json
{
    "type": "state_change",
    "state": "awaiting_followup",
    "reason": "AI completed counterpoint"
}
```

**Conversation Ended**

```json
{
    "type": "conversation_ended",
    "reason": "auto_terminated",
    "summary": {
        "totalTurns": 12,
        "duration": 900000,
        "stanceShift": {
            "initial": "pro-strong",
            "final": "pro-weak"
        }
    }
}
```

**Error**

```json
{
    "type": "error",
    "code": "GEMINI_ERROR",
    "message": "Failed to connect to AI service"
}
```

**Token Usage Update**

```json
{
    "type": "token_usage",
    "inputTokens": 150,
    "outputTokens": 200,
    "cost": 0.003
}
```

---

## Gemini Live Integration

### Architecture

```
┌─────────────┐     WebSocket      ┌──────────────────┐     gRPC/WS      ┌─────────────┐
│   Client    │ ◄─────────────────►│  Mentora Server  │ ◄───────────────►│ Gemini Live │
│  (Browser)  │                    │   (SvelteKit)    │                  │     API     │
└─────────────┘                    └──────────────────┘                  └─────────────┘
                                            │
                                            │ Firestore
                                            ▼
                                   ┌──────────────────┐
                                   │    Firebase      │
                                   │  (Conversations) │
                                   └──────────────────┘
```

### Session Management

1. **Session Creation**: When a conversation starts, create a Gemini Live session
2. **Context Injection**: Provide assignment prompt, persona, and conversation history
3. **Streaming Bridge**: Relay audio/text between client and Gemini Live
4. **Turn Management**: Track conversation turns and state transitions
5. **Cost Tracking**: Monitor token usage and update wallet in real-time

### AI Persona Configuration

```json
{
    "persona": "socratic-gentle",
    "systemPrompt": "You are a Socratic tutor named Mentor...",
    "dialecticalStrategies": {
        "clarify": {
            "trigger": "vague_statement",
            "examples": ["What do you mean by...", "Can you define..."]
        },
        "challenge": {
            "trigger": "weak_evidence",
            "examples": [
                "What evidence supports...",
                "Is there a causal link..."
            ]
        },
        "devilsAdvocate": {
            "trigger": "one_sided_view",
            "examples": [
                "If you were on the other side...",
                "Consider someone who..."
            ]
        }
    },
    "autoTermination": {
        "enabled": true,
        "conditions": [
            "student_reached_conclusion",
            "circular_argument_detected",
            "max_turns_reached"
        ]
    }
}
```

### Response Delay (Long-Form Mode)

For assignments with delayed responses:

1. Student submits turn
2. Server acknowledges and stores turn
3. After configured delay (hours/days), Gemini generates response
4. Push notification sent to student
5. Student returns to continue dialogue

---

## Rate Limits

| Endpoint              | Rate Limit            |
| --------------------- | --------------------- |
| REST API              | 100 requests/minute   |
| WebSocket connections | 5 concurrent          |
| Audio streaming       | 60 seconds continuous |

---

## Appendix: Dialectical Strategies

| Strategy         | Trigger                   | Purpose                              |
| ---------------- | ------------------------- | ------------------------------------ |
| Clarify          | Vague/ambiguous statement | Ensure mutual understanding          |
| Challenge        | Weak evidence or logic    | Test argument strength               |
| Devil's Advocate | One-sided perspective     | Encourage multi-perspective thinking |

---

## Changelog

| Version | Date       | Changes               |
| ------- | ---------- | --------------------- |
| 1.0.0   | 2026-01-03 | Initial specification |
