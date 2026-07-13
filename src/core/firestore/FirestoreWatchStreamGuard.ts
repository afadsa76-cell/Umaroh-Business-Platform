/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
export interface GuardedStream {
  queryKey: string;
  path: string;
  registeredAt: number;
  lastActive: number;
}

export class FirestoreWatchStreamGuard {
  private static instance: FirestoreWatchStreamGuard;
  private activeStreams = new Map<string, GuardedStream>();

  private constructor() {}

  public static getInstance(): FirestoreWatchStreamGuard {
    const globalKey = '__firestore_watch_stream_guard__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreWatchStreamGuard();
    }
    return (globalThis as any)[globalKey];
  }

  public registerStream(queryKey: string, path: string): void {
    if (this.activeStreams.has(queryKey)) {
      console.warn(`[FirestoreWatchStreamGuard] Duplicate query target registered: ${queryKey}`);
    }

    this.activeStreams.set(queryKey, {
      queryKey,
      path,
      registeredAt: Date.now(),
      lastActive: Date.now(),
    });
  }

  public unregisterStream(queryKey: string): void {
    if (!this.activeStreams.has(queryKey)) {
      console.warn(`[FirestoreWatchStreamGuard] Attempting to unregister non-existent stream: ${queryKey}`);
    } else {
      this.activeStreams.delete(queryKey);
    }
  }

  public touchStream(queryKey: string): void {
    const stream = this.activeStreams.get(queryKey);
    if (stream) {
      stream.lastActive = Date.now();
    }
  }

  public getActiveStreams(): GuardedStream[] {
    return Array.from(this.activeStreams.values());
  }

  public checkForOrphans(maxIdleMs = 60000): string[] {
    const now = Date.now();
    const orphans: string[] = [];
    this.activeStreams.forEach((stream, key) => {
      if (now - stream.lastActive > maxIdleMs) {
        orphans.push(key);
      }
    });
    return orphans;
  }
}
