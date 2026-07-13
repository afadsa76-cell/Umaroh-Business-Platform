/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
export type FirestoreEvent =
  | { type: 'ListenerCreated'; payload: { path: string; queryKey: string } }
  | { type: 'ListenerDestroyed'; payload: { path: string; queryKey: string } }
  | { type: 'SnapshotUpdated'; payload: { path: string; docCount: number } }
  | { type: 'NetworkOffline'; payload?: never }
  | { type: 'NetworkRecovered'; payload?: never }
  | { type: 'RetryStarted'; payload: { attempt: number; delay: number; error: any } }
  | { type: 'RetryFinished'; payload: { attempt: number; success: boolean } }
  | { type: 'RecoveryCompleted'; payload: { strategy: string } }
  | { type: 'StateChanged'; payload: { from: string; to: string } }
  | { type: 'DiagnosticsTriggered'; payload: { timestamp: number } }
  | { type: 'MetricLogged'; payload: { key: string; value: number } };

export type EventCallback<T extends FirestoreEvent['type']> = (
  event: Extract<FirestoreEvent, { type: T }>
) => void;

export class FirestoreEventBus {
  private static instance: FirestoreEventBus;
  private listeners: { [key in FirestoreEvent['type']]?: Array<EventCallback<any>> } = {};

  private constructor() {}

  public static getInstance(): FirestoreEventBus {
    const globalKey = '__firestore_event_bus__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreEventBus();
    }
    return (globalThis as any)[globalKey];
  }

  public subscribe<T extends FirestoreEvent['type']>(
    type: T,
    callback: EventCallback<T>
  ): () => void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type]!.push(callback);
    return () => {
      this.listeners[type] = this.listeners[type]?.filter((cb) => cb !== callback);
    };
  }

  public emit<T extends FirestoreEvent['type']>(
    type: T,
    payload?: Extract<FirestoreEvent, { type: T }>['payload']
  ): void {
    const list = this.listeners[type];
    if (list) {
      const event = { type, payload } as any;
      list.forEach((callback) => {
        try {
          callback(event);
        } catch (err) {
          console.error(`[FirestoreEventBus] Error in listener for ${type}:`, err);
        }
      });
    }
  }
}
