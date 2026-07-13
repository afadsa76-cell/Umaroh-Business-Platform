/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file FirestoreTransactionManager.ts
 * @description Firestore-compliant implementation of the ITransactionManager.
 */

import { ITransactionManager } from './ITransactionManager.js';
import { TransactionContext } from './TransactionContext.js';
import { TransactionOptions } from './TransactionOptions.js';
import { TransactionResult } from './TransactionResult.js';
import { TransactionExecutor } from './TransactionExecutor.js';
import { db, runTransaction } from '../../../../firebase.js';
import { TransactionRollbackException } from '../../domain/exceptions/TransactionRollbackException.js';
import { TransactionCancelledException } from '../../domain/exceptions/TransactionCancelledException.js';
import { TransactionConflictException } from '../../domain/exceptions/TransactionConflictException.js';
import { IIdempotencyRepository } from '../../domain/repositories/IIdempotencyRepository.js';

export class FirestoreTransactionManager implements ITransactionManager {
  private readonly dbInstance: any;
  private readonly executor: TransactionExecutor;

  /**
   * @constructor
   * @param dbInstance - Injected firestore db instance.
   * @param idempotencyRepo - Optional idempotency repository.
   */
  constructor(dbInstance: any = db, idempotencyRepo?: IIdempotencyRepository) {
    this.dbInstance = dbInstance;
    this.executor = new TransactionExecutor(idempotencyRepo);
  }

  /**
   * Manually initiates a transaction context session.
   */
  public async begin(options: TransactionOptions = {}): Promise<TransactionContext> {
    const txId = `tx_${Math.random().toString(36).substring(2, 11)}`;
    const context = new TransactionContext(txId, options);
    await context.acquireLocks();
    console.log(`[TransactionManager] Manual begin for ${txId}`);
    return context;
  }

  /**
   * Executes a transaction block within a prepared context.
   */
  public async execute<T>(
    context: TransactionContext,
    operation: (ctx: TransactionContext) => Promise<T>
  ): Promise<TransactionResult<T>> {
    try {
      if (!await this.validate(context)) {
        throw new TransactionConflictException(`Transaction context ${context.id} is invalid or has expired.`);
      }
      
      const res = await operation(context);
      context.transitionTo('COMMITTED');
      return TransactionResult.success(context, res);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      await this.rollback(context, error);
      return TransactionResult.failure(context, error);
    } finally {
      context.releaseLocks();
    }
  }

  /**
   * Commits updates performed inside the context.
   */
  public async commit(context: TransactionContext): Promise<void> {
    context.transitionTo('COMMITTED');
    context.releaseLocks();
    console.log(`[TransactionManager] Manual commit for ${context.id}`);
  }

  /**
   * Rolls back changes performed inside the context, marking it as ROLLED_BACK.
   */
  public async rollback(context: TransactionContext, error?: Error): Promise<void> {
    context.transitionTo('ROLLED_BACK');
    context.releaseLocks();
    console.warn(`[TransactionManager] Rollback initiated for ${context.id}. Reason: ${error?.message || 'None provided'}`);
    
    // If we are actively running inside Firestore's transaction loop, we must throw to force native Firestore abort
    if (context.getFirestoreTransaction()) {
      throw error || new TransactionRollbackException(`Transaction explicit rollback for context ${context.id}`);
    }
  }

  /**
   * Forces a retry of a transaction context operation.
   */
  public async retry<T>(
    context: TransactionContext,
    operation: (ctx: TransactionContext) => Promise<T>
  ): Promise<TransactionResult<T>> {
    context.incrementAttempt();
    console.log(`[TransactionManager] Manual retry requested for ${context.id}. Attempt: ${context.attempt}`);
    return await this.execute(context, operation);
  }

  /**
   * Explicitly cancels an ongoing transaction context session.
   */
  public async cancel(context: TransactionContext, reason?: string): Promise<void> {
    context.transitionTo('CANCELLED');
    context.releaseLocks();
    const cancelMsg = reason ? `Cancel reason: ${reason}` : 'No reason provided';
    console.warn(`[TransactionManager] Cancel initiated for ${context.id}. ${cancelMsg}`);
    
    if (context.getFirestoreTransaction()) {
      throw new TransactionCancelledException(`Transaction cancelled: ${cancelMsg}`);
    }
  }

  /**
   * Validates if the transaction state is active and fit for updates.
   */
  public async validate(context: TransactionContext): Promise<boolean> {
    const isTimeout = (Date.now() - context.startTime.getTime()) > (context.options.timeoutMs ?? 10000);
    const isActive = context.status === 'ACTIVE';
    return isActive && !isTimeout;
  }

  /**
   * Syntactic sugar wrapping standard withTransaction operations.
   * Runs the operation directly within a native Firestore transaction callback.
   */
  public async withTransaction<T>(
    operation: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const result = await this.run(operation, options);
    if (!result.success && result.error) {
      throw result.error;
    }
    return result.data as T;
  }

  /**
   * Runs an operation with standard transaction orchestration inside runTransaction().
   */
  public async run<T>(
    operation: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    // We wrap the entire execution with our TransactionExecutor
    // Inside our executor, we will wrap Firestore's runTransaction if necessary.
    return await this.executor.execute(async (ctx: TransactionContext) => {
      // Execute the operation inside a native Firestore runTransaction
      let finalResult: T | undefined;
      
      await runTransaction(this.dbInstance, async (fsTx: any) => {
        console.log(`[FirestoreTransaction] Initiating native Firestore transaction callback for context: ${ctx.id}`);
        // Set the active Firestore transaction reference
        ctx.setFirestoreTransaction(fsTx);
        
        // Check if the context is still valid before running
        if (!await this.validate(ctx)) {
          throw new TransactionConflictException(`Transaction context ${ctx.id} became invalid before starting the native block.`);
        }

        // Run the operations
        finalResult = await operation(ctx);
        console.log(`[FirestoreTransaction] Finished operations within callback for context: ${ctx.id}. Preparing native commit...`);
      });

      return finalResult as T;
    }, options);
  }
}
