/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreConnectionManager } from './FirestoreConnectionManager';
import { FirestoreOfflineCoordinator } from './FirestoreOfflineCoordinator';
import { FirestoreRetryController } from './FirestoreRetryController';

export type RecoveryDecision = 'RETRY' | 'OFFLINE_MODE' | 'FATAL' | 'IGNORE';

export class FirestoreRecoveryManager {
  private static instance: FirestoreRecoveryManager;
  private connectionManager = FirestoreConnectionManager.getInstance();
  private offlineCoordinator = FirestoreOfflineCoordinator.getInstance();
  private retryController = FirestoreRetryController.getInstance();

  private constructor() {}

  public static getInstance(): FirestoreRecoveryManager {
    const globalKey = '__firestore_recovery_manager__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreRecoveryManager();
    }
    return (globalThis as any)[globalKey];
  }

  public handleAndTriageError(err: any): RecoveryDecision {
    if (!err) return 'IGNORE';
    const code = String(err.code || '').toLowerCase();
    const msg = String(err.message || err).toLowerCase();

    console.warn(`[FirestoreRecoveryManager] Triaging error: code=${code}, message=${msg}`);

    if (code.includes('permission-denied') || msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
      return 'FATAL';
    }

    if (this.retryController.isTransientError(err)) {
      if (msg.includes('quota') || code.includes('resource-exhausted') || msg.includes('quota exceeded')) {
        console.warn('[FirestoreRecoveryManager] Quota/Resource Exhausted. Switching immediately to local-only Cache Fallback.');
        this.offlineCoordinator.forceOfflineMode().catch(console.error);
        return 'OFFLINE_MODE';
      }
      return 'RETRY';
    }

    // Default to offline mode for generic connection issues
    if (msg.includes('network') || msg.includes('offline') || msg.includes('connect')) {
      this.offlineCoordinator.forceOfflineMode().catch(console.error);
      return 'OFFLINE_MODE';
    }

    return 'FATAL';
  }

  public async attemptFullConnectionRecycle(): Promise<boolean> {
    console.log('[FirestoreRecoveryManager] Attempting Connection Recycle recovery action...');
    return await this.connectionManager.triggerRecovery();
  }
}
