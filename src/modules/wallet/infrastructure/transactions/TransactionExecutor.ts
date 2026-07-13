/**
 * @file TransactionExecutor.ts
 * @description Core transaction runner orchestrating retries, timeouts, lock orchestration, and idempotency tracking.
 */

import { TransactionContext } from './TransactionContext.js';
import { TransactionOptions } from './TransactionOptions.js';
import { TransactionResult } from './TransactionResult.js';
import { TransactionRetryPolicy } from './TransactionRetryPolicy.js';
import { TransactionTimeoutHandler } from './TransactionTimeoutHandler.js';
import { TransactionMetrics } from './TransactionMetrics.js';
import { IIdempotencyRepository } from '../../domain/repositories/IIdempotencyRepository.js';
import { TransactionConflictException } from '../../domain/exceptions/TransactionConflictException.js';
import { TransactionTimeoutException } from '../../domain/exceptions/TransactionTimeoutException.js';
import { TransactionRollbackException } from '../../domain/exceptions/TransactionRollbackException.js';
import { TransactionCancelledException } from '../../domain/exceptions/TransactionCancelledException.js';
import { TransactionRetryExceededException } from '../../domain/exceptions/TransactionRetryExceededException.js';

export class TransactionExecutor {
  private readonly metrics = TransactionMetrics.getInstance();
  private readonly idempotencyRepo?: IIdempotencyRepository;

  /**
   * @constructor
   * @param idempotencyRepo - Injected optional idempotency repository.
   */
  constructor(idempotencyRepo?: IIdempotencyRepository) {
    this.idempotencyRepo = idempotencyRepo;
  }

  /**
   * Orchestrates the execution of a transaction block.
   */
  public async execute<T>(
    operation: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const txId = `tx_${Math.random().toString(36).substring(2, 11)}`;
    const context = new TransactionContext(txId, options);
    const timeoutMs = options.timeoutMs ?? 10000;
    
    this.metrics.increment('transaction.count');
    console.log(`[TransactionBegin] ID: ${txId}, Attempt: 1. Initiating transaction orchestration...`);

    // 1. Idempotency Check (Pre-execution)
    if (options.idempotencyKey && this.idempotencyRepo) {
      try {
        const existingRecord = await this.idempotencyRepo.getKey(options.idempotencyKey);
        if (existingRecord) {
          if (existingRecord.status === 'COMPLETED') {
            console.log(`[Idempotency Hit] ID: ${txId}, Key: ${options.idempotencyKey}. Found completed record, returning cached payload.`);
            const payload = existingRecord.responsePayload ? JSON.parse(existingRecord.responsePayload) : undefined;
            context.transitionTo('COMMITTED');
            return TransactionResult.success(context, payload);
          } else if (existingRecord.status === 'PENDING') {
            console.warn(`[Idempotency Conflict] ID: ${txId}, Key: ${options.idempotencyKey}. Duplicate transaction already in progress.`);
            throw new TransactionConflictException(`Duplicate request in progress for idempotency key: ${options.idempotencyKey}`);
          }
        }
        
        // Key is fresh, mark it as PENDING
        await this.idempotencyRepo.acquireKey(options.idempotencyKey, Math.floor(timeoutMs / 1000) + 60);
      } catch (err: unknown) {
        if (err instanceof TransactionConflictException) {
          context.transitionTo('FAILED');
          this.metrics.increment('transaction.failure');
          return TransactionResult.failure(context, err);
        }
        console.warn(`[Idempotency Warning] Failed during pre-check for key ${options.idempotencyKey}:`, err);
      }
    }

    // 2. Retry Loop
    while (true) {
      try {
        // Acquire Pessimistic Locks if configured (deadlock-preventive sorting done inside LockManager)
        await context.acquireLocks();

        // Wrap execution inside the latency timeout boundary
        const operationResult = await TransactionTimeoutHandler.executeWithTimeout(
          async () => {
            return await operation(context);
          },
          timeoutMs,
          txId
        );

        // Transition to committed and release locks
        context.transitionTo('COMMITTED');
        context.releaseLocks();

        // 3. Resolve Idempotency Key
        if (options.idempotencyKey && this.idempotencyRepo) {
          try {
            const payloadStr = operationResult !== undefined ? JSON.stringify(operationResult) : '';
            await this.idempotencyRepo.resolveKey(options.idempotencyKey, payloadStr);
          } catch (err) {
            console.warn(`[Idempotency Warning] Failed to resolve key ${options.idempotencyKey}:`, err);
          }
        }

        console.log(`[TransactionCommit] ID: ${txId}, Success! Transaction committed successfully.`);
        return TransactionResult.success(context, operationResult);

      } catch (error: unknown) {
        // ALWAYS release locks immediately on failure before retry/rollback to prevent deadlocking others
        context.releaseLocks();

        const typedError = error instanceof Error ? error : new Error(String(error));

        // Track metrics and logs based on specific exception types
        if (typedError instanceof TransactionTimeoutException) {
          this.metrics.increment('transaction.timeout');
          console.error(`[TransactionTimeout] ID: ${txId}, Attempt: ${context.attempt + 1}. Timeout exceeded.`);
        } else if (typedError instanceof TransactionRollbackException) {
          this.metrics.increment('transaction.rollback');
          console.warn(`[TransactionRollback] ID: ${txId}, Attempt: ${context.attempt + 1}. Rollback requested: ${typedError.message}`);
        } else if (typedError instanceof TransactionCancelledException) {
          console.warn(`[TransactionCancelled] ID: ${txId}, Attempt: ${context.attempt + 1}. Transaction cancelled: ${typedError.message}`);
        }

        // Check if error is retryable and if retry policy permits
        const isConflict = TransactionRetryPolicy.isConflictError(typedError);
        const canRetry = TransactionRetryPolicy.shouldRetry(context.attempt, options);

        if (isConflict && canRetry) {
          context.incrementAttempt();
          const backoffDelay = TransactionRetryPolicy.calculateDelay(context.attempt, options);
          console.log(`[TransactionRetry] ID: ${txId}, Conflict detected. Retrying attempt ${context.attempt + 1} after backoff of ${backoffDelay}ms...`);
          
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          continue; // rerun loop
        }

        // Cannot retry or max attempts exceeded
        context.transitionTo('FAILED');
        this.metrics.increment('transaction.failure');

        // Clean up pending idempotency key on failure
        if (options.idempotencyKey && this.idempotencyRepo) {
          try {
            await this.idempotencyRepo.failKey(options.idempotencyKey);
          } catch (err) {
            console.warn(`[Idempotency Warning] Failed to clear key ${options.idempotencyKey} on failure:`, err);
          }
        }

        const finalError = isConflict && !canRetry
          ? new TransactionRetryExceededException(`Transaction retry limits exceeded after ${context.attempt + 1} attempts due to conflicts. Original error: ${typedError.message}`)
          : typedError;

        console.error(`[TransactionFailure] ID: ${txId}, Completed with error: ${finalError.message}`);
        return TransactionResult.failure(context, finalError);
      }
    }
  }
}
