/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreEventBus } from './FirestoreEventBus';

export class FirestoreMetrics {
  private static instance: FirestoreMetrics;
  private eventBus = FirestoreEventBus.getInstance();

  private registry: Record<string, number> = {
    'listener.created': 0,
    'listener.destroyed': 0,
    'listener.reused': 0,
    'listener.duplicated': 0,
    'snapshot.updated': 0,
    'snapshot.reused': 0,
    'connection.online': 0,
    'connection.offline': 0,
    'reconnect.count': 0,
    'retry.count': 0,
    'watchstream.errors': 0,
    'runtime.errors': 0,
  };

  private constructor() {
    // Listen to some state events to automatically log metrics
    this.eventBus.subscribe('StateChanged', (event) => {
      if (event.payload.to === 'ONLINE') {
        this.increment('connection.online');
      } else if (event.payload.to === 'OFFLINE') {
        this.increment('connection.offline');
      }
    });

    this.eventBus.subscribe('ListenerCreated', () => {
      this.increment('listener.created');
    });

    this.eventBus.subscribe('ListenerDestroyed', () => {
      this.increment('listener.destroyed');
    });

    this.eventBus.subscribe('SnapshotUpdated', () => {
      this.increment('snapshot.updated');
    });

    this.eventBus.subscribe('RetryStarted', () => {
      this.increment('retry.count');
    });
  }

  public static getInstance(): FirestoreMetrics {
    const globalKey = '__firestore_metrics__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreMetrics();
    }
    return (globalThis as any)[globalKey];
  }

  public increment(key: string): void {
    if (this.registry[key] !== undefined) {
      this.registry[key]++;
    } else {
      this.registry[key] = 1;
    }
    this.eventBus.emit('MetricLogged', { key, value: this.registry[key] });
  }

  public recordValue(key: string, value: number): void {
    this.registry[key] = value;
    this.eventBus.emit('MetricLogged', { key, value });
  }

  public getMetrics(): Record<string, number> {
    return { ...this.registry };
  }

  public get(key: string): number {
    return this.registry[key] || 0;
  }
}
