/**
 * @file TransactionResult.ts
 * @description Standard structure representing the outcome of a transaction execution.
 */

import { TransactionContext } from './TransactionContext.js';

export class TransactionResult<T> {
  public readonly success: boolean;
  public readonly data?: T;
  public readonly error?: Error;
  public readonly transactionId: string;
  public readonly attempts: number;
  public readonly durationMs: number;
  public readonly status: TransactionContext['status'];

  private constructor(
    success: boolean,
    transactionId: string,
    attempts: number,
    status: TransactionContext['status'],
    durationMs: number,
    data?: T,
    error?: Error
  ) {
    this.success = success;
    this.transactionId = transactionId;
    this.attempts = attempts;
    this.status = status;
    this.durationMs = durationMs;
    this.data = data;
    this.error = error;
  }

  /**
   * Factory method to construct a successful result.
   */
  public static success<T>(context: TransactionContext, data?: T): TransactionResult<T> {
    const duration = Date.now() - context.startTime.getTime();
    return new TransactionResult<T>(
      true,
      context.id,
      context.attempt + 1,
      'COMMITTED',
      duration,
      data
    );
  }

  /**
   * Factory method to construct a failed result.
   */
  public static failure<T>(context: TransactionContext, error: Error): TransactionResult<T> {
    const duration = Date.now() - context.startTime.getTime();
    return new TransactionResult<T>(
      false,
      context.id,
      context.attempt + 1,
      context.status,
      duration,
      undefined,
      error
    );
  }
}
