# Mentora API Access Layer Architecture

## Overview

The Mentora API uses a **hybrid access architecture**:

- **Direct Access (Firestore SDK)** - For **Read/List** operations and simple updates.
- **Delegated Access (Backend API)** - For **Create** operations requiring validation, complex permission checks, atomicity, or third-party integrations.

**Key Principle**: Use backend for writes to enforce business logic and data integrity; use Firestore SDK for reads to maximize performance and real-time capabilities.

## Direct Access via `mentora-api`

These operations use Firestore SDK directly. Security is enforced by Firestore Security Rules.

### Users

- `client.users.getMyProfile()` - Get current user's profile
- `client.users.getProfile(uid)` - Get a user profile
- `client.users.updateMyProfile(updates)` - Update current user's profile

### Courses

- `client.courses.get(courseId)` - Get a course
- `client.courses.listMine()` - List courses owned by user
- `client.courses.listEnrolled()` - List courses as student
- `client.courses.listAllEnrolled()` - List all enrolled courses
- `client.courses.listPublic()` - List public courses
- `client.courses.update(courseId, updates)` - Update a course
- `client.courses.delete(courseId)` - Delete a course
- `client.courses.getRoster(courseId)` - Get course roster
- `client.courses.inviteMember(courseId, email, role?)` - Invite member
- `client.courses.updateMember(courseId, memberId, updates)` - Update member role/status
- `client.courses.removeMember(courseId, memberId)` - Remove member (soft delete)

### Topics

- `client.topics.get(topicId)` - Get a topic
- `client.topics.listForCourse(courseId)` - List topics for a course
- `client.topics.update(topicId, updates)` - Update a topic
- `client.topics.delete(topicId)` - Delete a topic

### Assignments

- `client.assignments.get(assignmentId)` - Get an assignment
- `client.assignments.listForCourse(courseId)` - List assignments for a course
- `client.assignments.listAvailable(courseId)` - List available assignments
- `client.assignments.update(assignmentId, updates)` - Update assignment
- `client.assignments.delete(assignmentId)` - Delete assignment

### Submissions

- `client.submissions.get(assignmentId, userId)` - Get a submission
- `client.submissions.getMine(assignmentId)` - Get current user's submission
- `client.submissions.listForAssignment(assignmentId)` - List all submissions
- `client.submissions.start(assignmentId)` - Start a submission
- `client.submissions.submit(assignmentId)` - Submit the assignment
- `client.submissions.grade(assignmentId, userId, updates)` - Grade a submission

### Conversations

- `client.conversations.get(conversationId)` - Get a conversation
- `client.conversations.getForAssignment(assignmentId, userId?)` - Get conversation for assignment
- `client.conversations.create(assignmentId)` - Create conversation (direct Firestore)
- `client.conversations.end(conversationId)` - End conversation (direct Firestore)
- `client.conversations.addTurn(conversationId, text, type)` - Add a turn (direct Firestore)

### Wallets

- `client.wallets.get(walletId)` - Get a wallet
- `client.wallets.getMine()` - Get current user's wallet
- `client.wallets.listEntries(walletId)` - List ledger entries

### Real-time Subscriptions

All resources support real-time subscriptions via `onSnapshot`.

## Delegated Access (Backend API)

These operations are delegated to the backend for security and validation.

### Core Operations (Create/Join)

| Operation         | Endpoint                   | Method | Reason                                            |
| ----------------- | -------------------------- | ------ | ------------------------------------------------- |
| Create Course     | `/api/courses`             | POST   | Code uniqueness, atomicity                        |
| Join Course       | `/api/courses/join`        | POST   | Prevent listing/querying course codes on frontend |
| Get/Create Wallet | `/api/courses/[id]/wallet` | GET    | Secure wallet creation if not exists              |

### Third-Party Services

| Operation      | Endpoint                     | Method | Reason                                    |
| -------------- | ---------------------------- | ------ | ----------------------------------------- |
| LLM Message    | `/api/llm` (action: message) | POST   | Google Gemini / OpenAI API key secret     |
| LLM Streaming  | `/api/llm/stream`            | POST   | SSE Streaming                             |
| Voice Services | `/api/voice`                 | POST   | Google Cloud Speech / ElevenLabs API keys |
| Payment        | `/api/wallets` (add credits) | POST   | Idempotency, Stripe integration           |

## Backend Endpoints Structure

```
apps/mentora/src/routes/api/
├── courses/
│   ├── +server.ts                # POST: Create Course
│   ├── join/+server.ts           # POST: Join by Code
│   └── [id]/
│       └── wallet/+server.ts     # GET: Get/Create Course Wallet
├── llm/
│   ├── +server.ts                # POST: LLM Actions (message, analyze, summary, preview)
│   └── stream/+server.ts         # POST: SSE Streaming
├── voice/
│   └── +server.ts                # POST: Voice Actions (transcribe, synthesize)
└── wallets/
    └── +server.ts                # POST: Add Credits
```

## Security

### Direct Access (Client-side)

- Firestore Security Rules enforce all permissions
- User authentication via Firebase Auth

### Delegated Access (Backend)

- Firebase ID token verification via `requireAuth`
- Validates inputs before database interaction
- Hides sensitive query logic (e.g., finding course by code)
