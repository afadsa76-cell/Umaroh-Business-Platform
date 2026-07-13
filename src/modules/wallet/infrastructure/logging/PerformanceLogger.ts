/**
 * @file PerformanceLogger.ts
 * @description Logger for telemetry timing metrics and slow query alerts.
 * @responsibility Monitor execution durations, latency, and report bottlenecks.
 * 
 * TODO: Integrate direct prometheus or open telemetry metrics pushing.
 */

import { ILogger } from '../../domain/interfaces/ILogger.js';

export class PerformanceLogger implements ILogger {
  private readonly clientContext: unknown;

  /**
   * @constructor
   * @param clientContext - Injected client context for sending timers.
   */
  constructor(clientContext: unknown) {
    this.clientContext = clientContext;
  }

  // #region Methods
  public info(message: string, context?: unknown): void {
    console.log(this.clientContext, message, context);
  }

  public warn(message: string, context?: unknown): void {
    console.warn(message, context);
  }

  public error(message: string, context?: unknown): void {
    console.error(message, context);
  }
  // #endregion
}
