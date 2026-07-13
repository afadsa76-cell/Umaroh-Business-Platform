/**
 * @file WalletMetrics.ts
 * @description Standard operational KPI metrics reporting class.
 * @responsibility Gather and push transaction volume, processing duration, and error count metrics.
 * 
 * TODO: Stream values to Google Cloud Monitoring.
 */

import { IMonitor } from './IMonitor.js';

export class WalletMetrics implements IMonitor {
  private readonly clientContext: unknown;

  /**
   * @constructor
   * @param clientContext - Injected cloud telemetry client.
   */
  constructor(clientContext: unknown) {
    this.clientContext = clientContext;
  }

  // #region Methods
  public recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    console.log(this.clientContext, name, value, tags);
  }

  public startTimer(name: string): () => void {
    console.log(name);
    return () => {};
  }

  public recordEvent(name: string, description: string): void {
    console.log(name, description);
  }
  // #endregion
}
