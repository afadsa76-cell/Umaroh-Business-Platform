/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreEventBus } from './FirestoreEventBus';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  backoffFactor: number;
}

export class FirestoreRetryController {
  private static instance: FirestoreRetryController;
  private eventBus = FirestoreEventBus.getInstance();

  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 500,
    backoffFactor: 2,
  };

  private constructor() {}

  public static getInstance(): FirestoreRetryController {
    const globalKey = '__firestore_retry_controller__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreRetryController();
    }
    return (globalThis as any)[globalKey];
  }

  public isTransientError(err: any): boolean {
    if (!err) return false;
    const msg = String(err.message || err).toLowerCase();
    const code = String(err.code || '').toLowerCase();

    return (
      code.includes('resource-exhausted') ||
      code.includes('unavailable') ||
      code.includes('deadline-exceeded') ||
      code.includes('aborted') ||
      code.includes('cancelled') ||
      msg.includes('network-request-failed') ||
      msg.includes('could not reach cloud firestore backend') ||
      msg.includes('failed to connect') ||
      msg.includes('quota exceeded')
    );
  }

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultConfig, ...customConfig };
    let attempt = 0;
    let delay = config.initialDelayMs;

    while (attempt < config.maxAttempts) {
      try {
        return await operation();
      } catch (err) {
        attempt++;
        if (attempt >= config.maxAttempts || !this.isTransientError(err)) {
          this.eventBus.emit('RetryFinished', { attempt, success: false });
          throw err;
        }

        console.warn(
          `[FirestoreRetryController] Transient error detected. Retrying in ${delay}ms... (Attempt ${attempt}/${config.maxAttempts})`,
          err
        );
        this.eventBus.emit('RetryStarted', { attempt, delay, error: err });
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= config.backoffFactor;
      }
    }
    throw new Error('[FirestoreRetryController] Max retry attempts reached.');
  }
}
