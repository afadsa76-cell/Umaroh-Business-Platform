# Sprint 2B.4: Validation & Policy Engine Report

This document presents the architecture, engineering design, implementation, and verification of the **Sprint 2B.4 Validation & Policy Engine** for the enterprise Wallet Service.

---

## 1. Executive Summary

The **Validation & Policy Engine** acts as the strict pre-transaction gatekeeper for all core Wallet Service operations. Every request (such as Deposit, Withdraw, Transfer, Reserve, Freeze, Settlement, Commission, Refund, and Adjustment) must successfully pass through this pipeline before being orchestrated by the `TransactionManager`.

### Key Metrics
- **Pipeline Stages**: 12 ordered, decoupled, and highly cohesive execution stages.
- **Architectural Patterns**: DDD, Clean Architecture, SOLID, Specification Pattern, Policy Pattern, Pipeline Pattern, and Chain of Responsibility.
- **Test Outcomes**: 13 out of 13 integration scenarios executed with **100% success rate**.
- **Type Safety**: Zero `any` types introduced.

---

## 2. Structural Architecture

The validation layer is decoupled into core domain components adhering to strict DDD boundaries:

```
[ Incoming Request ]
         │
         ▼
 ┌────────────────────────────────────────────────────────┐
 │            ValidationPipeline (Pipeline)               │
 ├────────────────────────────────────────────────────────┤
 │                                                        │
 │  Stage 1: RequestStructure (WalletRequestValidator)    │
 │  Stage 2: Authentication (PermissionValidator)         │
 │  Stage 3: Authorization (PermissionValidator)          │
 │  Stage 4: Permission (PermissionValidator)             │
 │  Stage 5: Wallet Exists (WalletStateValidator)         │
 │  Stage 6: Wallet State (WalletStateValidator)          │
 │  Stage 7: Currency (CurrencyValidator)                 │
 │  Stage 8: Limit (Balance/WalletLimitValidator)         │
 │  Stage 9: Version (VersionValidator)                   │
 │  Stage 10: Idempotency (IdempotencyValidator)          │
 │  Stage 11: Risk Velocity (RiskValidator)               │
 │  Stage 12: Business Policy (BusinessPolicyValidator)   │
 │                                                        │
 └─────────────────────────┬──────────────────────────────┘
                           │
                 [ All Stages Passed? ]
                  /                  \
                YES                   NO
                /                       \
               ▼                         ▼
┌─────────────────────────────┐ ┌───────────────────────────────────┐
│ READY FOR TRANSACTION MGMT  │ │ Map & Throw Fine-Grained Exception│
└─────────────────────────────┘ └───────────────────────────────────┘
```

---

## 3. Component Details & Design Patterns

### 3.1. The Pipeline & Context Patterns
- **`ValidationContext`**: Carrier object holding request data, cached database aggregates (to prevent redundant read IO), custom metadata (limits, velocity counters), and accumulated errors.
- **`ValidationPipeline`**: Orchestrator executing stages sequentially while executing independent rules *within* each stage in parallel (via `Promise.all`), optimizing performance while maintaining strict logical sequence boundaries. Supports immediate short-circuiting.

### 3.2. DDD Specification Pattern (`ISpecification<T, C>`)
Enforces reusable, isolated business requirements:
1. **`WalletIsActiveSpecification`**: Asserts a wallet's status is `ACTIVE`.
2. **`WalletIsFrozenSpecification`**: Asserts a wallet's status is `FROZEN`.
3. **`WalletHasEnoughBalanceSpecification`**: Validates available balance segment, subtracting frozen and escrow segments to prevent double-spending.
4. **`WalletHasPermissionSpecification`**: Matches user role and permissions against operational boundaries.
5. **`WalletCurrencyMatchSpecification`**: Confirms transaction currency aligns with the target wallet's native currency.
6. **`WalletLimitSpecification`**: Ensures individual transactions reside between allowed single-transaction min/max bounds.
7. **`WalletDailyLimitSpecification`**: Restricts the accumulated daily transaction velocity.
8. **`WalletMonthlyLimitSpecification`**: Restricts the accumulated monthly transaction velocity.
9. **`WalletVersionSpecification`**: Optimistic concurrency version check comparing requested version against wallet checksum or timestamp.
10. **`WalletIdempotencySpecification`**: Evaluates idempotency key freshness.

### 3.3. Policy Pattern (`IPolicy<T, R>`)
Decouples highly dynamic business rules:
- **`DepositPolicy`**: Restricts deposits to active or pending wallets (frozen/closed wallets rejected).
- **`WithdrawPolicy`**: Restricts withdrawals to fluid available balances of active wallets; explicitly excludes reward balances.
- **`TransferPolicy`**: Prevents escrow wallets from initiating transfers, and blocks transactions involving terminal wallet states.
- **`FreezePolicy`**: Blocks freeze or unfreeze commands on terminal/closed/archived wallets.
- **`ReservePolicy`**: Enforces sufficient available funds for escrow reserves.
- **`SettlementPolicy`**: Blocks settlement if target wallet is in pending or closed states.
- **`CommissionPolicy`**: Ensures MLM commissions are officially approved before ledger posting.
- **`RefundPolicy` & `AdjustmentPolicy`**: Restricts adjustments and refunds to non-terminal wallets.

---

## 4. Exception Mapping Matrix

When a validation rule fails, the unified `WalletValidator` facade extracts the prioritized error and maps it to the precise, fine-grained domain exception:

| Stage Name | Specific Validator | Failed Rule Check | Thrown Domain Exception | Error Code |
|:---|:---|:---|:---|:---|
| **RequestStructure** | `WalletRequestValidator` | Negative/zero amount, high decimal precision | `ValidationException` | `ERR_VALIDATION_FAILED` |
| **Authentication** | `PermissionValidator` | Missing or invalid auth token (JWT) | `PermissionDeniedException` | `ERR_PERMISSION_DENIED` |
| **Authorization** | `PermissionValidator` | Role is unauthorized or forbidden | `PermissionDeniedException` | `ERR_PERMISSION_DENIED` |
| **Permission** | `PermissionValidator` | Lacking specific required role/permission | `PermissionDeniedException` | `ERR_PERMISSION_DENIED` |
| **WalletExists** | `WalletStateValidator` | Target wallet is not found in the DB | `WalletStateException` | `ERR_WALLET_CLOSED` / custom |
| **WalletState** | `WalletStateValidator` | Interacting with frozen, closed, suspended wallet | `WalletStateException` | `ERR_WALLET_CLOSED` / custom |
| **Currency** | `CurrencyValidator` | Mismatched currency codes across wallets | `CurrencyMismatchException` | `ERR_CURRENCY_MISMATCH` |
| **Limit (Balance)** | `BalanceValidator` | Insufficient fluid available balance | `LimitExceededException` | `ERR_LIMIT_EXCEEDED` |
| **Limit (Velocity)**| `WalletLimitValidator` | Exceeded daily/monthly velocity limit | `LimitExceededException` | `ERR_LIMIT_EXCEEDED` |
| **Version** | `VersionValidator` | Concurrency check mismatch | `WalletStateException` | `ERR_WALLET_CLOSED` / custom |
| **Idempotency** | `IdempotencyValidator` | Key collision (completed/pending transaction) | `DuplicateRequestException` | `ERR_DUPLICATE_REQUEST` |
| **Risk / Fraud** | `RiskValidator` | Bot-like client IP rate, high fraud risk score | `RiskDetectedException` | `ERR_RISK_DETECTED` |
| **BusinessPolicy** | `BusinessPolicyValidator` | Core policy breach (e.g., unapproved commission) | `PolicyViolationException` | `ERR_POLICY_VIOLATION` |

---

## 5. Telemetry & Metrics

We record transaction safety indicators under standard names:
- `validation.count`: Incremented on every incoming request.
- `validation.failure`: Incremented whenever validation fails.
- `validation.success`: Incremented on fully successful validation runs.
- `validation.duration`: Records exact processing latency in milliseconds.
- `policy.violation`: Incremented on business policy breaches.
- `risk.detected`: Incremented on fraud or rate limiting triggers.

---

## 6. Integration Test Results

A full integration test suite was written in `scripts/test-validation.ts` and successfully executed:

```bash
npx tsx scripts/test-validation.ts
```

### Test Output

```
======================================================================
         RUNNING SPRINT 2B.4 VALIDATION & POLICY ENGINE TESTS         
======================================================================
✅ Test PASSED: Negative Amount Check (Correctly threw ValidationException)
✅ Test PASSED: Decimal Precision Check (Correctly threw ValidationException)
✅ Test PASSED: Permission Denied Check (Non-admin doing Freeze) (Correctly threw PermissionDeniedException)
✅ Test PASSED: Closed Wallet Access Check (Correctly threw WalletStateException)
✅ Test PASSED: Frozen Wallet Outflow Restriction (Correctly threw WalletStateException)
✅ Test PASSED: Currency Mismatch Check (Correctly threw CurrencyMismatchException)
✅ Test PASSED: Single Transaction Lower Bound Check (Correctly threw LimitExceededException)
✅ Test PASSED: Daily Velocity Limit Check (Correctly threw LimitExceededException)
✅ Test PASSED: Optimistic Concurrency Control Check (Correctly threw WalletStateException)
✅ Test PASSED: Idempotency Key Collision Check (Correctly threw DuplicateRequestException)
✅ Test PASSED: Fraud Risk Score Block Check (Correctly threw RiskDetectedException)
✅ Test PASSED: Unapproved MLM Commission Policy Check (Correctly threw PolicyViolationException)
✅ Test PASSED: Full Validation Success Path executed cleanly with no exceptions!
======================================================================
TEST EXECUTION SUMMARY: 13 PASSED, 0 FAILED
======================================================================
```

All 13 test scenarios executed successfully with zero failures, confirming the structural integrity, correctness, and short-circuit capability of the entire pipeline.
