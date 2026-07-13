# Sprint 2B.3: Transaction Manager Implementation Report

**Author:** Principal Distributed Systems Engineer & Firestore Transaction Specialist  
**Domain:** Wallet Service Transaction Orchestration  
**Status:** Completed  
**Build Status:** [![Build Success](https://img.shields.io/badge/Build-Success-success)](https://ai.studio/build)  
**Lint Status:** [![Lint Success](https://img.shields.io/badge/Lint-Success-success)](https://ai.studio/build)

---

## 1. Executive Summary

This report documents the architectural design, implementation, and verification of the **Sprint 2B.3 Transaction Manager** for the enterprise-grade Wallet Service. 

The Transaction Manager forms the absolute core of the Wallet Service, providing robust ACID transaction orchestration, optimistic concurrency controls, automatic exponential backoffs with jitter, latency-bounded timeouts, deadlock prevention, and framework-level idempotency protection. In strict compliance with domain-driven design (DDD) principles and constraints:
1. **Zero Wallet Business Logic**: There is no hardcoded calculation of balances, ledger entries, or transaction types (deposits, withdrawals, transfers, settlements).
2. **Encapsulated Firestore Transactions**: All low-level Firestore transaction invocations (`runTransaction`) are isolated inside this component, eliminating leaky abstractions from other services.

---

## 2. System Architecture

The Transaction Manager sits between the Application/Domain layer and the low-level infrastructure storage (Firestore/Memory). It acts as a transactional gatekeeper.

### 2.1 Component Architecture Diagram

```
                 +-----------------------------------------+
                 |       Application / Use Case Layer      |
                 +-------------------+---------------------+
                                     |
                                     v [withTransaction / run]
                 +-------------------+---------------------+
                 |       ITransactionManager (Interface)   |
                 +-------------------+---------------------+
                                     |
                                     v
                 +-------------------+---------------------+
                 |     FirestoreTransactionManager         |
                 +----+--------------+---------------+-----+
                      |              |               |
                      |              v               |
                      |    +---------+---------+     |
                      |    | TransactionExecutor |     |
                      |    +---------+---------+     |
                      |              |               |
                      |              v               |
                      v              v               v
           +----------+----+   +-----+----+   +------+-----+
           | LockManager   |   | Retry    |   | Timeout    |
           | (Concurrency) |   | Policy   |   | Handler    |
           +----------+----+   +-----+----+   +------+-----+
                      |              |               |
                      +--------------+---------------+
                                     |
                                     v
                       +-------------+-------------+
                       |    TransactionContext     |
                       +-------------+-------------+
                                     | (Proxies Reads/Writes)
                                     v
                       +-------------+-------------+
                       |    Cloud Firestore DB     |
                       +---------------------------+
```

### 2.2 Core Responsibilities Matrix

| Class / Component | Primary Responsibility | Key Patterns |
| :--- | :--- | :--- |
| `ITransactionManager` | Interface/port boundary defining standard transaction operations. | Port/Adapter (Hexagonal) |
| `FirestoreTransactionManager` | Firestore adapter implementing the `ITransactionManager` boundary. | Adapter, Proxy |
| `TransactionContext` | State-carrier for a single transaction session; provides transactional proxies. | Context Object |
| `TransactionExecutor` | Orchestrating retries, timeouts, locking, and idempotency pre-checks. | Command / Orchestrator |
| `TransactionRetryPolicy` | Decides if a conflict is retryable and calculates backoff. | Strategy, Exponential Backoff |
| `TransactionLockManager` | Alphabetical sorting of resources to prevent deadlocks. | Mutex, Wait-Die / Sorted Lock |
| `TransactionTimeoutHandler` | Enforces bounded latency on transaction execution block. | Promise.race Wrapper |
| `TransactionMetrics` | Performance telemetry tracking counters and durations. | Singleton, Metrics Collector |

---

## 3. Transaction Lifecycle

A transaction context transitions through strict state stages. Once a transaction reaches a terminal state (`COMMITTED`, `ROLLED_BACK`, `FAILED`, `CANCELLED`), no further transitions or data modifications are permitted.

```
          [ begin() ]
               |
               v
          +----+----+
          |  ACTIVE | <--------------------------------+
          +----+----+                                  |
               |                                       | Retry Limit
               | (execute operation)                   | Not Exceeded
               v                                       |
    (Exception Thrown?)                                |
        /          \                                   |
     (No)          (Yes)                               |
      /              \                                 |
     /             (Is Conflict?)                      |
    v                /        \                        |
[ commit() ]      (Yes)       (No)                     |
    |               /            \                     |
    v        [ retry() ]       [ rollback() ]          |
+---+-------+       |              |                   |
| COMMITTED |       v              v                   |
+-----------+   (Eligible?)   +----+-------+           |
                     /    \   | ROLLED_BACK|           |
                  (Yes)  (No) +------------+           |
                    /        \                         |
                   v          v                        |
            [ delayMs ]   +----+---+                   |
                   |      | FAILED | ------------------+
                   v      +--------+
            (Re-execute)
```

---

## 4. Operational Flows

### 4.1 Retry Flow (Optimistic Concurrency Control)
When multiple clients attempt to modify the same document, Firestore detects a conflict and aborts. Our `TransactionRetryPolicy` calculates an exponential backoff with a full-random jitter to prevent thundering herd collisions:

$$\text{delay} = \text{initialDelay} \times \text{backoffFactor}^{\text{attempt}} + \text{Full Jitter}$$

```
Client A             Client B             LockManager           Firestore
   |                    |                      |                    |
   |-- getAndWrite ---->|                      |                    |
   |                    |-- getAndWrite ------>|                    |
   |                    |                      |                    |-- Success (A)
   |                    |<-- Conflict --------|                    |-- Conflict (B)
   |                    |                      |                    |
   |                    |-- calculateDelay() ->| [Backoff Period]   |
   |                    |-- Retrying... ------>|                    |
   |                    |                      |                    |-- Success (B)
```

### 4.2 Rollback Flow
If a business exception occurs inside a transaction, the `TransactionExecutor` catches the exception, updates the transaction context status to `FAILED`/`ROLLED_BACK`, releases all held lock resources to free other waiting transactions, and propagates the error. If running inside Firestore's native block, throwing an error immediately signals Firestore to abort and discard all staged mutations.

### 4.3 Concurrency & Deadlock Prevention
Deadlocks are prevented deterministically through sorted lock acquisition (Alphabetical Resource Sorting).

```
   Transaction 1 requests: ["wallet_B", "wallet_A"] -> Sorted to: ["wallet_A", "wallet_B"]
   Transaction 2 requests: ["wallet_A", "wallet_B"] -> Sorted to: ["wallet_A", "wallet_B"]
   
   Result: Both lock "wallet_A" first, then "wallet_B". Transaction 2 waits for "wallet_A",
   preventing the circular lock wait condition.
```

---

## 5. Transaction Sequence Diagram

This sequence diagram illustrates a fully orchestrated transaction using `FirestoreTransactionManager` with lock acquisition and idempotency validation:

```
Client         FirestoreTxManager      IdempotencyRepo        LockManager        TransactionContext       Firestore
  |                    |                     |                     |                    |                 |
  |--- run(op) ------->|                     |                     |                    |                 |
  |                    |-- acquireKey() ---->|                     |                    |                 |
  |                    |<- Success ----------|                     |                    |                 |
  |                    |                     |                     |                    |                 |
  |                    |-- acquireLocks() ------------------------>|                    |                 |
  |                    |<- Locks Acquired -------------------------|                    |                 |
  |                    |                     |                     |                    |                 |
  |                    |-- runTransaction() ------------------------------------------------------------->|
  |                    |                                                                                  |-- Callback Open
  |                    |-- execute(op) ------------------------------------------------->|                |
  |                    |                                                                 |-- get(docRef)->|
  |                    |                                                                 |<- docSnapshot -|
  |                    |                                                                 |-- update() --->| (Staged)
  |                    |                                                                 |                |
  |                    |<- Callback Success --------------------------------------------------------------|-- Commit Successful
  |                    |                     |                     |                    |                 |
  |                    |-- resolveKey() ---->|                     |                    |                 |
  |                    |-- releaseLocks() ------------------------>|                    |                 |
  |                    |                     |                     |                    |                 |
  |<-- TxResult(OK) ---|                     |                     |                    |                 |
```

---

## 6. Performance Analysis

Under heavy write-concurrency, transaction durability and lock duration determine the maximum system throughput:

1. **Short Lock Windows**: Reads and calculations are executed close to write boundaries.
2. **Exponential Backoff Jittering**: Eliminates coordinated retries, distributing load smoothly over time.
3. **Optimistic Locking**: Firestore's multiversion concurrency control (MVCC) ensures read-only transactions never block writers, maintaining high performance under heavy analytical queries.

---

## 7. Risk Analysis

| Identified Risk | Severity | Mitigation Strategy | Status |
| :--- | :--- | :--- | :--- |
| **Thundering Herd** | Medium | Integrated full random jitter into backoff delay calculation. | **Mitigated** |
| **Deadlock Conditions** | High | Alphabetical resource sorting in the `TransactionLockManager` guarantees deterministic locking order. | **Mitigated** |
| **Double Spend / Race** | Critical | Strict integration with `IdempotencyRepository` prevents executing identical keys twice. | **Mitigated** |
| **Infinite Loops** | High | `TransactionRetryPolicy` enforces hard `maxRetries` bounds, throwing `TransactionRetryExceededException`. | **Mitigated** |
| **Thread Blockage** | High | `TransactionTimeoutHandler` wraps executions in a latency-bounded promise race. | **Mitigated** |

---

## 8. Definition of Done (DoD) Verification

- [x] Zero compilation errors under `npm run build`.
- [x] Zero syntax/linter issues under `npm run lint`.
- [x] Full separation of concerns (Zero wallet business logic, zero deposit/withdraw operations).
- [x] 100% test coverage readiness across exceptions and managers.
- [x] Validated with Google Cloud Firestore constraints.
