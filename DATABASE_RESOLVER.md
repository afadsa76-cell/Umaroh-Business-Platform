
# Dynamic Database Resolver Runbook
The `AdminDatabaseResolver` connects natively to various Firestore databases in the same Firebase project without duplicating the `initializeApp` instantiation.

## Syntax Usage
```typescript
const db = AdminDatabaseResolver.getDatabase(databaseId);
```
