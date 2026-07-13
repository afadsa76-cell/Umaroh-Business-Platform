/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreSubscriptionManager } from './FirestoreSubscriptionManager';
import { FirestoreSnapshotPool } from './FirestoreSnapshotPool';
import { FirestoreWatchStreamGuard } from './FirestoreWatchStreamGuard';
import { FirestoreMetrics } from './FirestoreMetrics';

export class FirestoreListenerRegistry {
  private static instance: FirestoreListenerRegistry;
  private subManager = FirestoreSubscriptionManager.getInstance();
  private snapPool = FirestoreSnapshotPool.getInstance();
  private streamGuard = FirestoreWatchStreamGuard.getInstance();
  private metrics = FirestoreMetrics.getInstance();

  private activeCallbacks = new Map<string, Set<(snapshot: any) => void>>();

  private constructor() {}

  public static getInstance(): FirestoreListenerRegistry {
    const globalKey = '__firestore_listener_registry__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreListenerRegistry();
    }
    return (globalThis as any)[globalKey];
  }

  public subscribe(
    queryKey: string,
    path: string,
    setupRealListener: (onNext: (snap: any) => void) => () => void,
    callback: (snapshot: any) => void
  ): () => void {
    if (!this.activeCallbacks.has(queryKey)) {
      this.activeCallbacks.set(queryKey, new Set());
    }
    
    const callbacksSet = this.activeCallbacks.get(queryKey)!;
    callbacksSet.add(callback);

    // Call callback immediately if we already have a cached snapshot in pool
    const cached = this.snapPool.getSnapshot(queryKey);
    if (cached) {
      this.metrics.increment('snapshot.reused');
      try {
        callback(cached);
      } catch (err) {
        console.error(`[FirestoreListenerRegistry] Error triggering initial callback for ${queryKey}:`, err);
      }
    }

    const isFirst = this.subManager.addSubscriber(queryKey, path);
    if (isFirst) {
      this.streamGuard.registerStream(queryKey, path);

      // Setup the real Firestore SDK listener
      const sdkUnsubscribe = setupRealListener((snap) => {
        // Touch the stream guard
        this.streamGuard.touchStream(queryKey);
        
        // Cache the snapshot
        this.snapPool.setSnapshot(path, queryKey, snap);

        // Distribute to all callbacks
        const currentCallbacks = this.activeCallbacks.get(queryKey);
        if (currentCallbacks) {
          currentCallbacks.forEach((cb) => {
            try {
              cb(snap);
            } catch (err) {
              console.error(`[FirestoreListenerRegistry] Error in subscriber callback for ${queryKey}:`, err);
            }
          });
        }
      });

      this.subManager.registerUnsubscribe(queryKey, sdkUnsubscribe);
    } else {
      this.metrics.increment('listener.reused');
    }

    return () => {
      callbacksSet.delete(callback);
      if (callbacksSet.size === 0) {
        this.activeCallbacks.delete(queryKey);
      }

      const isFullyRemoved = this.subManager.removeSubscriber(queryKey, path);
      if (isFullyRemoved) {
        this.streamGuard.unregisterStream(queryKey);
      }
    };
  }

  public getRegistryDump(): Array<{ queryKey: string; subscribers: number }> {
    return Array.from(this.activeCallbacks.entries()).map(([queryKey, callbacks]) => ({
      queryKey,
      subscribers: callbacks.size,
    }));
  }
}
