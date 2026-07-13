/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { enableNetwork as sdkEnableNetwork, disableNetwork as sdkDisableNetwork, Firestore } from 'firebase/firestore';
import { FirestoreStateMachine } from './FirestoreStateMachine';
import { FirestoreEventBus } from './FirestoreEventBus';
import { FirestoreNetworkManager } from './FirestoreNetworkManager';
import { FirestoreMetrics } from './FirestoreMetrics';

export class FirestoreConnectionManager {
  private static instance: FirestoreConnectionManager;
  private dbInstance: Firestore | null = null;
  private stateMachine = FirestoreStateMachine.getInstance();
  private eventBus = FirestoreEventBus.getInstance();
  private networkManager = FirestoreNetworkManager.getInstance();
  private metrics = FirestoreMetrics.getInstance();
  private operationPromise: Promise<void> | null = null;

  private constructor() {
    this.eventBus.subscribe('NetworkOffline', async () => {
      await this.goOffline('Browser event');
    });

    this.eventBus.subscribe('NetworkRecovered', async () => {
      await this.goOnline('Browser event');
    });
  }

  public static getInstance(): FirestoreConnectionManager {
    const globalKey = '__firestore_connection_manager__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreConnectionManager();
    }
    return (globalThis as any)[globalKey];
  }

  public setFirestore(db: Firestore): void {
    this.dbInstance = db;
    // Initial sync
    if (this.networkManager.isOnline()) {
      this.stateMachine.transitionTo('ONLINE');
    } else {
      this.stateMachine.transitionTo('OFFLINE');
    }
  }

  public getDb(): Firestore {
    if (!this.dbInstance) {
      throw new Error('[FirestoreConnectionManager] Firestore db not registered yet.');
    }
    return this.dbInstance;
  }

  public async goOffline(reason: string): Promise<void> {
    if (!this.dbInstance) return;
    if (this.stateMachine.getState() === 'OFFLINE' || this.stateMachine.getState() === 'DEGRADED') {
      return;
    }

    if (this.operationPromise) {
      await this.operationPromise;
    }

    this.operationPromise = (async () => {
      console.log(`[FirestoreConnectionManager] Transitioning OFFLINE due to: ${reason}`);
      this.stateMachine.transitionTo('OFFLINE');
      try {
        await sdkDisableNetwork(this.dbInstance!);
        console.log('[FirestoreConnectionManager] SDK network disabled successfully.');
      } catch (err) {
        console.error('[FirestoreConnectionManager] Failed to disable network:', err);
      }
    })();

    await this.operationPromise;
    this.operationPromise = null;
  }

  public async goOnline(reason: string): Promise<void> {
    if (!this.dbInstance) return;
    if (this.stateMachine.getState() === 'ONLINE') {
      return;
    }

    if (this.operationPromise) {
      await this.operationPromise;
    }

    this.operationPromise = (async () => {
      console.log(`[FirestoreConnectionManager] Transitioning ONLINE due to: ${reason}`);
      this.stateMachine.transitionTo('RECONNECTING');
      try {
        await sdkEnableNetwork(this.dbInstance!);
        this.stateMachine.transitionTo('ONLINE');
        this.metrics.increment('reconnect.count');
        console.log('[FirestoreConnectionManager] SDK network enabled successfully.');
      } catch (err) {
        console.error('[FirestoreConnectionManager] Failed to enable network, setting state DEGRADED:', err);
        this.stateMachine.transitionTo('DEGRADED');
      }
    })();

    await this.operationPromise;
    this.operationPromise = null;
  }

  public async triggerRecovery(): Promise<boolean> {
    if (!this.dbInstance) return false;
    this.stateMachine.transitionTo('RECOVERING');
    try {
      console.log('[FirestoreConnectionManager] Running network recovery recycle...');
      await sdkDisableNetwork(this.dbInstance);
      await sdkEnableNetwork(this.dbInstance);
      this.stateMachine.transitionTo('ONLINE');
      this.eventBus.emit('RecoveryCompleted', { strategy: 'Full Recycle' });
      return true;
    } catch (err) {
      console.error('[FirestoreConnectionManager] Recovery cycle failed:', err);
      this.stateMachine.transitionTo('DEGRADED');
      return false;
    }
  }
}
