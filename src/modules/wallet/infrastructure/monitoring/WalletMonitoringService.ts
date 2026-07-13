/**
 * @file WalletMonitoringService.ts
 * @description Core coordination service for logs, timers, and operational charts.
 * @responsibility Consolidate and expose consolidated monitoring feeds and performance alerts.
 * 
 * TODO: Integrate direct reporting dashboards support.
 */

import { IMonitor } from './IMonitor.js';
import { WalletTracing } from './WalletTracing.js';

export class WalletMonitoringService {
  private readonly monitor: IMonitor;
  private readonly tracer: WalletTracing;

  /**
   * @constructor
   * @param monitor - Injected operational metric recorder.
   * @param tracer - Injected span tracer context.
   */
  constructor(monitor: IMonitor, tracer: WalletTracing) {
    this.monitor = monitor;
    this.tracer = tracer;
  }

  // #region Methods
  public async logLatency(operationName: string, durationMs: number): Promise<void> {
    console.log(this.monitor, this.tracer);
    this.monitor.recordMetric(`operation.${operationName}.latency`, durationMs);
  }

  public async incrementErrorRate(operationName: string, errorType: string): Promise<void> {
    this.monitor.recordMetric(`operation.${operationName}.error`, 1, { errorType });
  }
  // #endregion
}
