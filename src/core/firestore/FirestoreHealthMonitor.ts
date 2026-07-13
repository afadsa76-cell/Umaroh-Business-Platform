/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreMetrics } from './FirestoreMetrics';
import { FirestoreSubscriptionManager } from './FirestoreSubscriptionManager';
import { FirestoreWatchStreamGuard } from './FirestoreWatchStreamGuard';
import { FirestoreStateMachine } from './FirestoreStateMachine';

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';

export interface HealthReport {
  status: HealthStatus;
  score: number; // 0 to 100
  activeSubscriptions: number;
  activeStreams: number;
  reconnectCount: number;
  retryCount: number;
  errorsLogged: number;
  state: string;
}

export class FirestoreHealthMonitor {
  private static instance: FirestoreHealthMonitor;
  private metrics = FirestoreMetrics.getInstance();
  private subManager = FirestoreSubscriptionManager.getInstance();
  private streamGuard = FirestoreWatchStreamGuard.getInstance();
  private stateMachine = FirestoreStateMachine.getInstance();

  private constructor() {}

  public static getInstance(): FirestoreHealthMonitor {
    const globalKey = '__firestore_health_monitor__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreHealthMonitor();
    }
    return (globalThis as any)[globalKey];
  }

  public getHealthReport(): HealthReport {
    const counts = this.subManager.getAllSubscriptionCounts();
    const activeSubscriptions = Object.values(counts).reduce((a, b) => a + b, 0);
    const activeStreams = this.streamGuard.getActiveStreams().length;
    
    const reconnectCount = this.metrics.get('reconnect.count');
    const retryCount = this.metrics.get('retry.count');
    const errorsLogged = this.metrics.get('runtime.errors') + this.metrics.get('watchstream.errors');
    
    const state = this.stateMachine.getState();

    // Deduct score based on issues
    let score = 100;
    
    // Connection State Deductions
    if (state === 'OFFLINE') score -= 20;
    if (state === 'DEGRADED') score -= 40;
    if (state === 'RECOVERING') score -= 10;
    
    // Error Deductions
    score -= Math.min(errorsLogged * 5, 30);
    
    // Excessive retries/reconnects deductions
    score -= Math.min(retryCount * 2, 15);
    score -= Math.min(reconnectCount * 3, 15);

    score = Math.max(0, score);

    let status: HealthStatus = 'HEALTHY';
    if (score < 40) {
      status = 'CRITICAL';
    } else if (score < 70) {
      status = 'DEGRADED';
    } else if (score < 90) {
      status = 'WARNING';
    }

    return {
      status,
      score,
      activeSubscriptions,
      activeStreams,
      reconnectCount,
      retryCount,
      errorsLogged,
      state,
    };
  }
}
