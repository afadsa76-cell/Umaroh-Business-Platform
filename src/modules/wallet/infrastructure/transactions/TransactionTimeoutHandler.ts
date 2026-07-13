/**
 * @file TransactionTimeoutHandler.ts
 * @description Latency-bounded timeout wrapper for transaction execution.
 */

import { TransactionTimeoutException } from '../../domain/exceptions/TransactionTimeoutException.js';

export class TransactionTimeoutHandler {
  /**
   * Wraps an asynchronous operation in a timeout boundary.
   * If the operation exceeds the duration, it throws a TransactionTimeoutException.
   */
  public static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    transactionId: string
  ): Promise<T> {
    let timerId: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        reject(
          new TransactionTimeoutException(
            `Transaction ${transactionId} execution exceeded timeout limit of ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } finally {
      if (timerId) {
        clearTimeout(timerId);
      }
    }
  }
}
