/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreEventBus } from './FirestoreEventBus';

export class FirestoreSnapshotPool {
  private static instance: FirestoreSnapshotPool;
  private cache = new Map<string, any>();
  private eventBus = FirestoreEventBus.getInstance();

  private constructor() {}

  public static getInstance(): FirestoreSnapshotPool {
    const globalKey = '__firestore_snapshot_pool__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreSnapshotPool();
    }
    return (globalThis as any)[globalKey];
  }

  public setSnapshot(path: string, queryKey: string, data: any): void {
    const prev = this.cache.get(queryKey);
    this.cache.set(queryKey, data);

    const docCount = data?.docs ? (typeof data.docs === 'function' ? data.docs().length : data.docs.length) : (data ? 1 : 0);
    this.eventBus.emit('SnapshotUpdated', { path, docCount });
  }

  public getSnapshot(queryKey: string): any | null {
    return this.cache.get(queryKey) || null;
  }

  public clear(): void {
    this.cache.clear();
  }

  public getCacheDump(): Array<{ queryKey: string; data: any }> {
    return Array.from(this.cache.entries()).map(([queryKey, data]) => ({
      queryKey,
      data,
    }));
  }
}
