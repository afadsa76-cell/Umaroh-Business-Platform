# PORTAL UMAROH ENTERPRISE — SECURITY AUDIT REPORT
**Role**: Principal Security Auditor & Firebase Architect  
**Status**: ENFORCED & APPROVED

---

## 1. PASSWORD HASH INTEGRITY (SCRYPT)

The migration preserves user passwords using the native Google SCRYPT algorithm. This allows users to sign in to the new project immediately using their existing passwords.

### 1.1 SCRYPT Configuration Settings
The following parameters are configured inside the migration parameters and mapped dynamically:
- **Algorithm**: `SCRYPT`
- **CPU rounds**: `8`
- **Memory Cost**: `14`
- **Salt Separator**: `Bw==` (Base64)
- **Signer Key**: Passed securely via environment variables (`HASH_KEY_BASE64`) rather than hardcoded in the script codebase.

---

## 2. DYNAMIC CUSTOM CLAIMS & PRIVILEGES

Custom claims (roles) are mapped 1:1 during user import to prevent privilege escalation or loss of access:
- **Roles preserved**: `admin`, `agent`, `vendor`, `customer`.
- **Validation step**: The `readinessValidator.ts` script audits all target user accounts to ensure claims match the database role 1:1, flagging any anomalies instantly.

---

## 3. CREDENTIAL PROTECTION & DRIVER WINDOW LOCKS

1. **Credentials Separation**: `source-service-account.json` and `target-service-account.json` are placed in the `.gitignore` to prevent leakage to source control.
2. **Driver-Level Write Protection**: When `READ_ONLY_MODE` or `MIGRATION_MODE` is activated, any write operations attempting to execute are instantly blocked by `FeatureFlagsManager` at the root wrapper level.
3. **Prevention of Duplicate Entries**: The Firestore batch write script uses deterministic doc IDs (`doc(db, col, originalId)`) rather than auto-generating IDs, preventing any duplication of data during retries or multiple runs.
