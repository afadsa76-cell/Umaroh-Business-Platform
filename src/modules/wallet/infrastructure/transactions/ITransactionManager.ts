/**
 * @file ITransactionManager.ts
 * @description Port boundary contract defining the standard transactions API for the Wallet domain.
 */

import { TransactionContext } from './TransactionContext.js';
import { TransactionOptions } from './TransactionOptions.js';
import { TransactionResult } from './TransactionResult.js';

export interface ITransactionManager {
  /**
   * Manually initiates a transaction context session.
   */
  begin(options?: TransactionOptions): Promise<TransactionContext>;

  /**
   * Executes a transaction block within a prepared context.
   */
  execute<T>(
    context: TransactionContext,
    operation: (ctx: TransactionContext) => Promise<T>
  ): Promise<TransactionResult<T>>;

  /**
   * Commits updates performed inside the context.
   */
  commit(context: TransactionContext): Promise<void>;

  /**
   * Rolls back changes performed inside the context, marking it as ROLLED_BACK.
   */
  rollback(context: TransactionContext, error?: Error): Promise<void>;

  /**
   * Forces a retry of a transaction context operation.
   */
  retry<T>(
    context: TransactionContext,
    operation: (ctx: TransactionContext) => Promise<T>
  ): Promise<TransactionResult<T>>;

  /**
   * Explicitly cancels an ongoing transaction context session.
   */
  cancel(context: TransactionContext, reason?: string): Promise<void>;

  /**
   * Validates if the transaction state is active and fit for updates.
   */
  validate(context: TransactionContext): Promise<boolean>;

  /**
   * Syntactic sugar wrapping withTransaction style operations.
   */
  withTransaction<T>(
    operation: (ctx: TransactionContext) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;

  /**
   * Runs an operation with standard transaction orchestration.
   */
  run<T>(
    operation: (ctx: TransactionContext) => Promise<T>,
    options?: TransactionOptions
  ): Promise<TransactionResult<T>>;
}
