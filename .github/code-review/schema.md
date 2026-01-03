# Schema Code Review Guidelines

When reviewing changes to **Firestore schemas** and data models in `packages/firebase/src/firestore/`:

## ✅ Required Checks

1. **Zod Schema Validation**
    - All document schemas must use Zod for validation
    - Export both `Schema` and `CreateSchema` variants where applicable
    - Ensure timestamp fields use Firestore timestamp helpers

2. **Type Consistency**
    - Exported TypeScript types must derive from Zod schemas (`z.infer<typeof Schema>`)
    - No inline type definitions that bypass schema validation

3. **Field Naming**
    - Use camelCase for all field names
    - Prefix boolean fields with `is`, `has`, or `can` (e.g., `isActive`, `hasAccess`)
    - Avoid abbreviations; prefer clarity (`userId` over `uid`)

4. **Required vs Optional**
    - Mark fields as `.optional()` only when truly optional
    - Provide `.default()` values for fields with sensible defaults
    - Document why a field is optional if not immediately obvious

5. **Collection Path Helpers**
    - Use `joinPath` utility for constructing document paths
    - Export path helper functions alongside schemas

## ⚠️ Common Issues

- **Breaking changes**: Adding required fields without defaults breaks existing documents
- **Enum drift**: Keep enums in sync between schema and Firestore security rules
- **Timestamp handling**: Ensure client-side Date objects are converted properly

## 🔗 Related Files

- Firestore security rules: `packages/firebase/sync/firestore.rules`
- Collection definitions: `packages/firebase/src/firestore/collections.ts`
