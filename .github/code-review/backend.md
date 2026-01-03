# Backend Code Review Guidelines

When reviewing changes to **Firebase backend logic** and server-side code:

## ✅ Required Checks

1. **Modular Firebase SDK**
    - Use modular imports: `import { getFirestore } from "firebase/firestore"`
    - No `firebase/compat` namespaces—they're deprecated and bundle-bloating
    - Compose with `getDoc`, `setDoc`, `updateDoc`, `deleteDoc`

2. **Data Validation**
    - Validate all inputs with Zod schemas before Firestore writes
    - Use schemas from `packages/firebase/src/firestore/`
    - Never trust client-provided data without validation

3. **Error Handling**
    - Return structured error responses with meaningful messages
    - Use `APIResult<T>` pattern for consistent success/error handling
    - Log errors appropriately for debugging

4. **Transaction Safety**
    - Use transactions for multi-document updates
    - Keep transactions short to avoid conflicts
    - Handle transaction retry logic gracefully

5. **Path Construction**
    - Use `joinPath` utility for building document paths
    - Reference collection helpers from `collections.ts`
    - Avoid string concatenation for paths

6. **API Design**
    - Follow RESTful conventions where applicable
    - Version APIs if breaking changes are needed
    - Document expected request/response shapes

## ⚠️ Common Issues

- **Missing validation**: Writing unvalidated data to Firestore
- **Race conditions**: Concurrent writes without transactions
- **Compat imports**: Using deprecated `firebase.firestore()` patterns
- **Unbounded queries**: Missing pagination or limits on list operations

## 🔗 Related Files

- Firebase utilities: `packages/firebase/src/`
- Firestore schemas: `packages/firebase/src/firestore/`
- CLI commands: `packages/mentora-cli/src/commands/`
