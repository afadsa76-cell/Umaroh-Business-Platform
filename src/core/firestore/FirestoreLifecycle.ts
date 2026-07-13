/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreConnectionManager } from './FirestoreConnectionManager';
import { FirestoreSubscriptionManager } from './FirestoreSubscriptionManager';
import { FirestoreSnapshotPool } from './FirestoreSnapshotPool';
import { FirestoreEventBus } from './FirestoreEventBus';
import { Firestore } from 'firebase/firestore';

export class FirestoreLifecycle {
  private static instance: FirestoreLifecycle;
  private connectionManager = FirestoreConnectionManager.getInstance();
  private subManager = FirestoreSubscriptionManager.getInstance();
  private snapshotPool = FirestoreSnapshotPool.getInstance();
  private eventBus = FirestoreEventBus.getInstance();
  private initialized = false;

  private constructor() {}

  public static getInstance(): FirestoreLifecycle {
    const globalKey = '__firestore_lifecycle__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreLifecycle();
    }
    return (globalThis as any)[globalKey];
  }

  public bootstrap(db: Firestore): void {
    if (this.initialized) {
      console.log('[FirestoreLifecycle] Re-bootstrapping lifecycle or reusing existing initialized instance.');
      return;
    }

    console.log('[FirestoreLifecycle] Bootstrapping global Firestore Stabilization Engine...');
    this.connectionManager.setFirestore(db);

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.shutdown();
      });
    }

    this.initialized = true;
  }

  public shutdown(): void {
    console.log('[FirestoreLifecycle] Shutting down and releasing all active subscribers/streams...');
    this.subManager.forceCleanAll();
    this.snapshotPool.clear();
    this.initialized = false;
  }
}
