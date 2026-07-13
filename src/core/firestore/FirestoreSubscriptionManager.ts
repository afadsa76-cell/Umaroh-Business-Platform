/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreEventBus } from './FirestoreEventBus';

export class FirestoreSubscriptionManager {
  private static instance: FirestoreSubscriptionManager;
  private subscribers = new Map<string, number>();
  private unsubscribes = new Map<string, () => void>();
  private eventBus = FirestoreEventBus.getInstance();

  private constructor() {}

  public static getInstance(): FirestoreSubscriptionManager {
    const globalKey = '__firestore_subscription_manager__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreSubscriptionManager();
    }
    return (globalThis as any)[globalKey];
  }

  public registerUnsubscribe(queryKey: string, unsub: () => void): void {
    this.unsubscribes.set(queryKey, unsub);
  }

  public addSubscriber(queryKey: string, path: string): boolean {
    const count = this.subscribers.get(queryKey) || 0;
    const newCount = count + 1;
    this.subscribers.set(queryKey, newCount);

    console.log(`[FirestoreSubscriptionManager] Subscriber added to ${queryKey}. Count: ${newCount}`);
    
    // Returns true if this is the FIRST subscriber (meaning we need to set up the real SDK listener)
    if (newCount === 1) {
      this.eventBus.emit('ListenerCreated', { path, queryKey });
      return true;
    }
    return false;
  }

  public removeSubscriber(queryKey: string, path: string): boolean {
    const count = this.subscribers.get(queryKey) || 0;
    if (count <= 0) return false;

    const newCount = count - 1;
    if (newCount === 0) {
      this.subscribers.delete(queryKey);
      const unsub = this.unsubscribes.get(queryKey);
      if (unsub) {
        try {
          unsub();
        } catch (err) {
          console.error(`[FirestoreSubscriptionManager] Error invoking unsubscribe for ${queryKey}:`, err);
        }
        this.unsubscribes.delete(queryKey);
      }
      this.eventBus.emit('ListenerDestroyed', { path, queryKey });
      console.log(`[FirestoreSubscriptionManager] All subscribers gone for ${queryKey}. Unsubscribed from SDK.`);
      return true; // True indicates that we fully cleaned up
    } else {
      this.subscribers.set(queryKey, newCount);
      console.log(`[FirestoreSubscriptionManager] Subscriber removed from ${queryKey}. Count: ${newCount}`);
      return false;
    }
  }

  public getSubscriberCount(queryKey: string): number {
    return this.subscribers.get(queryKey) || 0;
  }

  public getAllSubscriptionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.subscribers.forEach((count, key) => {
      counts[key] = count;
    });
    return counts;
  }

  public forceCleanAll(): void {
    console.log('[FirestoreSubscriptionManager] Forcing clean of all subscriptions...');
    this.unsubscribes.forEach((unsub, key) => {
      try {
        unsub();
      } catch (e) {}
    });
    this.unsubscribes.clear();
    this.subscribers.clear();
  }
}
