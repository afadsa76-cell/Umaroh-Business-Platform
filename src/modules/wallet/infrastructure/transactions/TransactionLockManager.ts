/**
 * @file TransactionLockManager.ts
 * @description Deadlock-preventive lock manager using alphabetic sorting and asynchronous mutex locks.
 */

export class TransactionLockManager {
  private static instance: TransactionLockManager | null = null;
  
  // Maps a resource ID to the transaction ID that currently holds the lock
  private activeLocks: Map<string, string> = new Map();
  // Queue of transactions waiting for a resource lock (resourceId -> array of resolving promises)
  private waiters: Map<string, (() => void)[]> = new Map();

  private constructor() {}

  public static getInstance(): TransactionLockManager {
    if (!TransactionLockManager.instance) {
      TransactionLockManager.instance = new TransactionLockManager();
    }
    return TransactionLockManager.instance;
  }

  /**
   * Sorts resource IDs alphabetically to prevent cyclic wait (deadlock prevention).
   */
  public sortResources(resourceIds: string[]): string[] {
    return [...resourceIds].sort((a, b) => a.localeCompare(b));
  }

  /**
   * Acquires locks on a set of resource IDs for a transaction.
   * Resolves when all locks are acquired successfully.
   */
  public async acquireLocks(transactionId: string, resourceIds: string[], timeoutMs: number = 5000): Promise<void> {
    if (resourceIds.length === 0) return;

    // Prevent cyclic wait by sorting resources alphabetically
    const sortedIds = this.sortResources(resourceIds);
    console.log(`[TransactionLockManager] Transaction ${transactionId} requesting locks in order: ${sortedIds.join(', ')}`);

    for (const resourceId of sortedIds) {
      const acquired = await this.acquireSingleLockWithTimeout(transactionId, resourceId, timeoutMs);
      if (!acquired) {
        // If we fail to acquire any lock, release all previously acquired locks in this attempt to avoid holding partial locks
        this.releaseLocks(transactionId, sortedIds);
        throw new Error(`Lock acquisition timed out for resource ${resourceId} by transaction ${transactionId}`);
      }
    }
  }

  /**
   * Releases locks held by a transaction on a set of resource IDs.
   */
  public releaseLocks(transactionId: string, resourceIds: string[]): void {
    if (resourceIds.length === 0) return;
    
    for (const resourceId of resourceIds) {
      const holder = this.activeLocks.get(resourceId);
      if (holder === transactionId) {
        this.activeLocks.delete(resourceId);
        console.log(`[TransactionLockManager] Released lock on ${resourceId} from transaction ${transactionId}`);
        
        // Notify the next waiting transaction in queue
        const queue = this.waiters.get(resourceId);
        if (queue && queue.length > 0) {
          const nextWaiter = queue.shift();
          if (nextWaiter) {
            nextWaiter();
          }
        }
      }
    }
  }

  /**
   * Attempts to acquire a single lock, queuing up if already held, with a timeout safety.
   */
  private async acquireSingleLockWithTimeout(transactionId: string, resourceId: string, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    
    while (true) {
      const currentHolder = this.activeLocks.get(resourceId);
      
      // If lock is free or held by ourselves, we can proceed
      if (!currentHolder || currentHolder === transactionId) {
        this.activeLocks.set(resourceId, transactionId);
        console.log(`[TransactionLockManager] Acquired lock on ${resourceId} for transaction ${transactionId}`);
        return true;
      }

      // Check timeout
      if (Date.now() - start >= timeoutMs) {
        return false;
      }

      // Wait until notified or poll
      await new Promise<void>((resolve) => {
        let queue = this.waiters.get(resourceId);
        if (!queue) {
          queue = [];
          this.waiters.set(resourceId, queue);
        }
        
        const timeoutId = setTimeout(() => {
          // Remove from waiters on timeout
          const q = this.waiters.get(resourceId);
          if (q) {
            const idx = q.indexOf(resolve);
            if (idx >= 0) q.splice(idx, 1);
          }
          resolve();
        }, Math.min(timeoutMs - (Date.now() - start), 100));

        queue.push(() => {
          clearTimeout(timeoutId);
          resolve();
        });
      });
    }
  }

  /**
   * Clears all locks (primarily for testing and emergency recovery).
   */
  public reset(): void {
    this.activeLocks.clear();
    this.waiters.clear();
  }
}
