# PORTAL UMAROH ENTERPRISE — ROLLBACK RUNBOOK & PROCEDURES
**Role**: Principal DevOps Engineer & Release Coordinator  
**Status**: ACTIVE & APPROVED

---

## 1. STRATEGIC ROLLBACK TRIGGERS

A rollback of the target project is immediately triggered if any of the following conditions are encountered during live production cutover:
1. **Unrecoverable Network Failures**: Target API endpoints return persistent $5xx$ status codes after exceeding the 5-retry limit.
2. **UID Corruption**: Any document is migrated with a generated or mismatched UID.
3. **Ledger Imbalance**: Post-migration double-entry sum verification yields a variance greater than **Rp 0.00**.
4. **Custom Claims Failure**: Admin or executive roles are not appended correctly during Auth import.

---

## 2. STEP-BY-STEP ROLLBACK PROCEDURE

### Step 2.1: Lock Incoming Transactions
Immediately trigger the read-only window across both projects to prevent any concurrent state writes:
- Ensure `READ_ONLY_MODE="true"` is set in environment.

### Step 2.2: Execute Purge Script
Run the automated rollback command:
```bash
npx tsx scripts/migration/migrationToolkit.ts --rollback
```

### Step 2.3: Purging Sequence Execution
The script executes:
1. **Target Auth Cleanup**: Fetches all newly migrated users and deletes them using `targetAuth.deleteUsers()`.
2. **Target Firestore Purge**: Deletes documents in parallel batches of 500 across `users`, `wallets`, `transactions`, `bookings`, `notifications`, and `tracker` collections.
3. **Session Reset**: Unlinks `.migration-checkpoint.json` so that the migration sequence can be restarted fresh with clean buffers.

---

## 3. POST-ROLLBACK VERIFICATION

Once the rollback terminates:
1. Run `npx tsx scripts/migration/readinessValidator.ts` against the target database to verify that it is fully sanitized and empty.
2. Check that user sessions on the source database are unaffected and operating normally.
