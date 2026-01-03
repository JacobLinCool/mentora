# Security Code Review Guidelines

When reviewing changes with **security implications**:

## ✅ Required Checks

### Firestore Security Rules

1. **Authentication**
    - All read/write rules require `request.auth != null` unless intentionally public
    - Verify `request.auth.uid` matches document ownership where applicable
    - Never rely solely on client-side checks

2. **Authorization**
    - Check role-based access (owner, instructor, member)
    - Validate resource relationships (e.g., user belongs to course)
    - Test both allowed and denied scenarios

3. **Data Validation in Rules**
    - Validate field types and constraints in rules
    - Ensure required fields are present on create
    - Prevent modification of immutable fields (e.g., `createdAt`)

4. **Rule Testing**
    - Add tests in `packages/firebase/tests/` for new rules
    - Test edge cases: missing auth, wrong user, invalid data
    - Run `pnpm --filter mentora-firebase test` before merging

### Application Security

5. **Input Sanitization**
    - Sanitize user input to prevent XSS
    - Escape HTML in dynamic content
    - Use parameterized queries/paths

6. **Sensitive Data**
    - Never log sensitive data (tokens, passwords, PII)
    - Don't expose internal errors to clients
    - Use environment variables for secrets

7. **API Security**
    - Validate authentication tokens server-side
    - Rate limit sensitive endpoints
    - Audit trail for critical operations

## ⚠️ Common Vulnerabilities

- **Overly permissive rules**: `allow read, write: if true`
- **Missing ownership checks**: Users accessing others' data
- **Insecure direct object references**: Predictable IDs without auth checks
- **Client-side only validation**: Server must re-validate

## 🔗 Related Files

- Security rules: `packages/firebase/sync/firestore.rules`
- Rules tests: `packages/firebase/test/rules/`
- Auth utilities: `apps/mentora/src/lib/firebase/auth.ts`
