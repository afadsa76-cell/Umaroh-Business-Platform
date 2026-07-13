/**
 * @file TransactionRetryPolicy.ts
 * @description Exponential backoff, jitter, and conflict detection logic for transaction retries.
 */

import { TransactionOptions } from './TransactionOptions.js';
import { RepositoryConflictException } from '../../domain/exceptions/RepositoryConflictException.js';
import { TransactionConflictException } from '../../domain/exceptions/TransactionConflictException.js';

export class TransactionRetryPolicy {
  /**
   * Calculates the delay in milliseconds for the next retry attempt using exponential backoff with jitter.
   * formula: delay = initialDelay * (backoffFactor ^ attempt) + Jitter
   */
  public static calculateDelay(attempt: number, options: TransactionOptions): number {
    const factor = options.backoffFactor ?? 2;
    const initialDelay = options.initialDelayMs ?? 100;
    
    // Exponential calculation
    const exponentialDelay = initialDelay * Math.pow(factor, attempt);
    
    // Add full jitter (0 to 50% of the calculated delay) to avoid Thundering Herd problems
    const jitter = Math.random() * (exponentialDelay * 0.5);
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Checks if an error is a transient conflict or concurrency collision that should trigger a retry.
   */
  public static isConflictError(error: unknown): boolean {
    if (!error) return false;

    // Check custom domain exceptions
    if (error instanceof RepositoryConflictException || error instanceof TransactionConflictException) {
      return true;
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorLower = errorMsg.toLowerCase();

    // Firestore specific retryable aborted/concurrency messages
    const isFirestoreAborted = errorLower.includes('aborted') || 
                               errorLower.includes('concurrency') || 
                               errorLower.includes('failed-precondition') ||
                               errorLower.includes('conflict') ||
                               errorLower.includes('write-conflict') ||
                               errorLower.includes('transaction aborted');

    // standard node or browser network errors that can be retried during lock recovery
    const isNetworkTransient = errorLower.includes('timeout') || 
                               errorLower.includes('socket hang up') || 
                               errorLower.includes('econnreset') ||
                               errorLower.includes('unavailable');

    return isFirestoreAborted || isNetworkTransient;
  }

  /**
   * Checks if retry attempts have exceeded configured limits.
   */
  public static shouldRetry(attempt: number, options: TransactionOptions): boolean {
    const maxRetries = options.maxRetries ?? 3;
    return attempt < maxRetries;
  }
}
