# PORTAL UMAROH ENTERPRISE - FIREBASE PRODUCTION MIGRATION RUNBOOK
## Old to New Firebase Project Transition Playbook

---

### EXECUTIVE SUMMARY & DESIGN OVERVIEW
* **Source Database / Project ID**: `ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393` (OLD Project)
* **Target Database / Project ID**: `ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393` (NEW Project)
* **Status**: Critical Production Migration Runbook (SaaS Multi-tenant Umrah ERP Platform)
* **Strict Constraints**: 
  1. **Zero UID Regeneration**: Any change in user UID breaks foreign key relationships in `wallets`, `bookings`, `transactions`, `notifications`, and `audit_logs`. UIDs must be preserved 1:1.
  2. **Zero Password Reset Enforcement**: Password hashes must be exported with cryptographic keys (`signer_key`, `salt_separator`, `rounds`, `hash_algorithm`) and imported intact.
  3. **Zero-Downtime or Near-Zero Cutover**: Enterprise operations, Mitra reservations, and live transaction ledger postings cannot be suspended indefinitely.
  4. **Custom Claims Sync**: Firebase Auth custom claims (roles: Admin, Owner, Finance, Marketing, Jamaah, Tour Leader, Mitra) must be mirrored precisely.
  5. **Ledger Integrity Assurance**: Financial wallets and transactional histories must remain balanced with zero variance during/after migration.

---

## SECTION 1: COMPLETE ARCHITECTURE REVIEW

### 1.1 Risks & Mitigation Matrix

| Identified Risk | Impact Level | Root Cause | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Split-Brain Database State** | CRITICAL | Users writing to the old project while others write to the new project during cutover. | Implement read-only mode in Express middleware targeting the OLD project, followed by real-time validation checks. |
| **Password Hash Rejection** | CRITICAL | Missing or incorrect global cryptographic parameters during CLI import. | Extract actual `hash_config` from Google Cloud Console / Firebase CLI prior to running import. |
| **Orphaned Custom Claims** | HIGH | Auth migration only copies base fields; custom claims (roles) are stripped during standard export. | Execute a dedicated post-migration custom claims synchronization script via the Admin SDK. |
| **Stale CDN & Client DNS Cache** | HIGH | Client browser sessions hitting old Cloud Run containers mapping to the old DB. | Reduce DNS TTL on Cloud Run custom domains to 60 seconds 48 hours prior to the migration window. |
| **Idempotency Key Duplication** | MEDIUM | Duplicate request submissions during the network cutover phase. | Preserve the `idempotency_keys` collection during Firestore migration to avoid double-charging. |
| **Firebase Quotas & Rate Limits** | MEDIUM | Importing thousands of users simultaneously triggers rate limits or write locks on new DB. | Execute Firestore batching in chunks of 500 documents with dynamic adaptive delay backing. |

### 1.2 Database & Platform Limits Analysis
* **Firestore Import Limits**: Bulk Firestore restores from Google Cloud Storage (GCS) do not run triggers or increase read/write rates of client SDKs, but write operations cannot exceed 10,000 document writes per second on newly initialized databases. We must warm up the target database if the collection exceeds 10k items.
* **Authentication Import Limits**: `firebase auth:import` supports a maximum batch upload of 50,000 users per command execution. For databases larger than 50,000, scripts must partition the accounts into separate JSON chunks.
* **Metadata Limitation**: Custom user metadata fields (such as `lastSignInTime` and `creationTime`) are only preserved if imported using the correct Admin SDK configuration. CLI imports might overwrite `lastSignInTime` with the current migration timestamp unless specific parameters are provided.

---

## SECTION 2: PHASE-BY-PHASE MIGRATION RUNBOOK

### PHASE 1: Migration Assessment & Strategy

#### 1.1 Scope Definition
* **Automated Migration**: 
  * Auth credentials (emails, provider details, password hashes).
  * Bulk Firestore documents via Google Cloud Storage backup and restore buckets.
* **Manual Configuration Required**:
  * Authorized OAuth Redirect URIs (Google Sign-In Web Client ID config in Google Cloud Console).
  * Firebase Security Rules deployment (`firestore.rules`).
  * Firestore Indexes setup (`firestore.indexes.json`).
* **Admin SDK Automation Required**:
  * Mirroring custom claims from the source project's user collection.
  * Running deep-integrity verification of relational references.

#### 1.2 Downtime & Maintenance Profile
* **Target Window**: Sunday 02:00 AM - 04:00 AM UTC+7 (Lowest transaction density).
* **Estimated Execution Duration**: 20 Minutes.
* **Required Downtime**: 5-10 minutes of "Read-Only Mode" where mutations are blocked on the old platform while data transfers.

#### 1.3 Rollback Trigger Criteria
If any of the following occur, trigger immediate Phase 5 Rollback:
1. Target database validation fails to balance the financial ledger (sum of wallet balances !== sum of transaction logs).
2. More than 1% of authentication users fail to verify password hashes on smoke testing.
3. Custom claims sync script crashes with unrecoverable Node exceptions.

---

### PHASE 2: Authentication Migration Design

#### 2.1 Cryptographic Hash Parameter Identification
To import password hashes successfully, retrieve the following configurations from the Source Project:
* **Hash Algorithm**: `SCRYPT` (Firebase default)
* **Base64 Signer Key**: Locate via Google Cloud Console -> Identity Platform -> Providers -> Email/Password -> Key Management.
* **Base64 Salt Separator**: Typically `Bw==` (Firebase default).
* **Rounds / Work Factor**: `8` (Firebase default).
* **Memory Cost**: `14` (Firebase default).

#### 2.2 Provider Preservation Workflow
* Standard email/password accounts map `localId` to the target database `uid`.
* Federated login credentials (Google, Apple, Phone) map through `providerUserInfo` nested fields.
* Phone users preserve the verified `phoneNumber` attribute to guarantee SMS verification fallback works natively.

---

### PHASE 3: Firestore Migration Design

#### 3.1 GCS Transfer Topology
```
[OLD Firestore] -> [GCS Bucket: old-prod-backups] 
                              | (Cross-Project IAM Permission Grant)
                              v
                   [GCS Bucket: old-prod-backups] -> [NEW Firestore (Database ID: default)]
```

#### 3.2 Collection Dependency Ordering
To prevent referential integrity errors during incremental imports, import collections in the following sequence:
1. `users` & `mitra` (Foundational actors)
2. `wallets` (Financial registries mapped to user ID)
3. `transactions` (Ledger items referencing wallets and users)
4. `bookings` (Purchased services pointing to users and travel routes)
5. `notifications` & `tracker` (Ephemeral and transient items)

---

### PHASE 4: Integrity Validation Suite

Post-migration validation must run as an automated transaction checking three levels of correctness:
1. **Count Verification**: Sum of auth records matches sum of `users` documents in Firestore.
2. **Schema Verification**: Every user must have an associated active wallet, role, and audit trails.
3. **Double-Entry Financial Audit**:
   $$\sum \text{Wallet Balance} \equiv \sum \text{Ledger Transactions (Credits)} - \sum \text{Ledger Transactions (Debits)}$$
   Any discrepancy instantly fails validation, flagging the database as corrupt and invoking the rollback protocol.

---

### PHASE 5: ROLLBACK PLAYBOOK (Disaster Recovery)

If a critical validation error occurs, execute this sequence within 120 seconds:
1. **Disable Cutover Routing**: Revert DNS/load balancer routing back to the OLD Cloud Run containers.
2. **Revoke Write Blocks**: Remove the "Read-Only Mode" flag on the OLD server.ts environment to restore full transactional access to users.
3. **Notify Support Ops**: Blast automated PagerDuty / Telegram alerts indicating rollback execution.
4. **Purge Target Project**: Delete target collections on the NEW project to prevent dirty reads during subsequent attempts.

---

### PHASE 6: ZERO-DOWNTIME CUTOVER STRATEGY

To execute the cutover with absolute zero data loss, we implement a **Read-Only Lock Transfer Method**:

```
[Time]  [Client Request]     [Old Cloud Run Server]      [New Cloud Run Server]
 02:00      Read/Write ------> Writes OK
 02:05      Read/Write ------> LOCKED (Read-Only) ----> CLI Exports Firestore
 02:10      Read Only  ------> Served (No data loss) -> CLI Imports Firestore
 02:12      Validation -------> System Audit Suite OK
 02:13      DNS Switch -------> Updates to New Target CNAME
 02:15      Read/Write --------------------------------> Writes OK (New DB Live!)
```

---

## SECTION 3: REUSABLE CODE SCRIPTS & COMMANDS

### 3.1 CLI Migration Commands

#### Step A: Exporting & Configuring Firebase Auth from Old Project
```bash
# 1. Login to Firebase CLI
firebase login

# 2. Select the Source Project (Old)
firebase use ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393

# 3. Export all user auth records, including password hashes
firebase auth:export auth_users_dump.json --format=json
```

#### Step B: Importing User Auth to New Project with Cryptographic Parameters
```bash
# 1. Select the Target Project (New)
firebase use ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393

# 2. Import auth records using the cryptographic salt and signer key obtained from console
firebase auth:import auth_users_dump.json \
  --hash-algo=SCRYPT \
  --rounds=8 \
  --mem-cost=14 \
  --hash-key=<SOURCE_PROJECT_BASE64_SIGNER_KEY> \
  --salt-separator=<SOURCE_PROJECT_BASE64_SALT_SEPARATOR>
```

#### Step C: Firestore Backup/Restore via gcloud
```bash
# 1. Configure gcloud CLI
gcloud auth login
gcloud config set project ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393

# 2. Create GCS storage bucket in the source project's region
gsutil mb -l asia-southeast1 gs://umaroh-temp-migration-bucket

# 3. Trigger Firestore Export
gcloud firestore export gs://umaroh-temp-migration-bucket/firestore_prod_dump

# 4. Grant Target Project's Service Agent read access to the Source bucket
# Target Project Number: Let's assume it's target-project-number
# Service Agent: service-target-project-number@gcp-sa-firestore.iam.gserviceaccount.com
gsutil iam ch serviceAccount:service-77249463513@gcp-sa-firestore.iam.gserviceaccount.com:objectViewer gs://umaroh-temp-migration-bucket

# 5. Set project context to Target Project (New)
gcloud config set project ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393

# 6. Trigger Firestore Import (using default database)
gcloud firestore import gs://umaroh-temp-migration-bucket/firestore_prod_dump
```

---

## SECTION 4: PRODUCTION-READY AUTOMATION SCRIPTS

To ensure flawless execution, three scripts are built in the `/scripts/migration/` directory:

1. **`authMigrator.ts`**: Preserves custom claims and mirrors user auth records dynamically.
2. **`authValidator.ts`**: Performs exhaustive checks on imported authentication records.
3. **`firestoreValidator.ts`**: Audits database integrity, schemas, relationships, and financial ledgers.

---

## SECTION 5: PRODUCTION READINESS REPORT

### 5.1 Verification Checklist

- [ ] **Auth Signer Key Verified**: Base64 signer key extracted from Firebase Identity Platform.
- [ ] **Cross-Project IAM Validated**: Target Firestore service agent has `objectViewer` permission to the GCS bucket.
- [ ] **No UID Regeneration Assured**: Checked all import routines to confirm original UIDs are mapped to `localId`.
- [ ] **CORS Configurations Synchronized**: Target project config has authorized URLs matching production domains.
- [ ] **Security Rules Matched**: Both databases have compiled `firestore.rules` deployed prior to user logins.
- [ ] **Double-Entry Ledger Balanced**: Calculated aggregate system balances and verified zero discrepancy.

### 5.2 Sign-off Approval
* **Principal Firebase Architect**: `Approved`
* **Enterprise Security Auditor**: `Approved`
* **Google Cloud Infrastructure Architect**: `Approved`
