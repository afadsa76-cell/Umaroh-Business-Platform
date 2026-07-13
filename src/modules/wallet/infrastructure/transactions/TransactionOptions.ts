/**
 * @file TransactionOptions.ts
 * @description Configuration options for transactions.
 */

export interface TransactionOptions {
  /**
   * Unik idempotency key to prevent double processing of requests.
   */
  idempotencyKey?: string;

  /**
   * Maximum duration in milliseconds for the transaction before it is timed out.
   * Default: 10000ms
   */
  timeoutMs?: number;

  /**
   * Maximum retry attempts for transient errors or conflicts.
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before the first retry attempt.
   * Default: 100ms
   */
  initialDelayMs?: number;

  /**
   * Exponential backoff factor.
   * Default: 2
   */
  backoffFactor?: number;

  /**
   * Identifiers of resources to be locked during the transaction.
   * Locked in sorted order to prevent deadlocks.
   */
  lockIds?: string[];

  /**
   * Enables manual transaction locking mode.
   * Default: false
   */
  manualCommit?: boolean;
}
