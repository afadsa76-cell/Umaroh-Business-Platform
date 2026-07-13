/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreStateMachine } from './FirestoreStateMachine';
import { FirestoreSubscriptionManager } from './FirestoreSubscriptionManager';
import { FirestoreSnapshotPool } from './FirestoreSnapshotPool';
import { FirestoreWatchStreamGuard } from './FirestoreWatchStreamGuard';
import { FirestoreMetrics } from './FirestoreMetrics';
import { FirestoreHealthMonitor } from './FirestoreHealthMonitor';

export interface DiagnosticsSnapshot {
  timestamp: number;
  connectionState: string;
  health: {
    status: string;
    score: number;
  };
  metrics: Record<string, number>;
  activeStreams: Array<{ queryKey: string; path: string; registeredAt: number; ageMs: number }>;
  subscriptions: Record<string, number>;
  cachedQueriesCount: number;
}

export class FirestoreDiagnostics {
  private static instance: FirestoreDiagnostics;
  private stateMachine = FirestoreStateMachine.getInstance();
  private subManager = FirestoreSubscriptionManager.getInstance();
  private snapshotPool = FirestoreSnapshotPool.getInstance();
  private streamGuard = FirestoreWatchStreamGuard.getInstance();
  private metrics = FirestoreMetrics.getInstance();
  private healthMonitor = FirestoreHealthMonitor.getInstance();

  private constructor() {}

  public static getInstance(): FirestoreDiagnostics {
    const globalKey = '__firestore_diagnostics__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreDiagnostics();
    }
    return (globalThis as any)[globalKey];
  }

  public getDiagnosticsSnapshot(): DiagnosticsSnapshot {
    const now = Date.now();
    const healthReport = this.healthMonitor.getHealthReport();
    
    const activeStreamsMapped = this.streamGuard.getActiveStreams().map((stream) => ({
      queryKey: stream.queryKey,
      path: stream.path,
      registeredAt: stream.registeredAt,
      ageMs: now - stream.registeredAt,
    }));

    return {
      timestamp: now,
      connectionState: this.stateMachine.getState(),
      health: {
        status: healthReport.status,
        score: healthReport.score,
      },
      metrics: this.metrics.getMetrics(),
      activeStreams: activeStreamsMapped,
      subscriptions: this.subManager.getAllSubscriptionCounts(),
      cachedQueriesCount: this.snapshotPool.getCacheDump().length,
    };
  }

  public generateMarkdownReport(): string {
    const snap = this.getDiagnosticsSnapshot();
    return `
# FIRESTORE DIAGNOSTICS SYSTEM REPORT
**Generated:** ${new Date(snap.timestamp).toISOString()}

## 1. System Health
- **Connection State:** ${snap.connectionState}
- **Health Level:** ${snap.health.status} (${snap.health.score}/100)

## 2. Active Watch Streams
Total active target watch streams: ${snap.activeStreams.length}
${snap.activeStreams.map((s) => `- \`${s.queryKey}\` (path: \`${s.path}\`, active for ${(s.ageMs / 1000).toFixed(1)}s)`).join('\n') || 'None'}

## 3. Subscriptions Mapping (Reference Counts)
${Object.entries(snap.subscriptions).map(([q, count]) => `- \`${q}\`: **${count}** subscriber(s)`).join('\n') || 'No active subscriptions'}

## 4. Key Metrics Registry
${Object.entries(snap.metrics).map(([k, val]) => `- **${k}:** ${val}`).join('\n')}

---
*End of Diagnostics Report*
`;
  }
}
