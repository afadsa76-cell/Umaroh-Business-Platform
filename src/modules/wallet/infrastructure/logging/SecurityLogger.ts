/**
 * @file SecurityLogger.ts
 * @description Logger for security alerts, rate-limit triggers, and checksum violations.
 * @responsibility Flag integrity compromises and suspicious transactions immediately.
 * 
 * TODO: Integrate pagerduty or instant incident trigger APIs.
 */

import { ILogger } from '../../domain/interfaces/ILogger.js';

export class SecurityLogger implements ILogger {
  private readonly alertsChannel: unknown;

  /**
   * @constructor
   * @param alertsChannel - Injected destination alert stream channel context.
   */
  constructor(alertsChannel: unknown) {
    this.alertsChannel = alertsChannel;
  }

  // #region Methods
  public info(message: string, context?: unknown): void {
    console.log(this.alertsChannel, message, context);
  }

  public warn(message: string, context?: unknown): void {
    console.warn(message, context);
  }

  public error(message: string, context?: unknown): void {
    console.error(message, context);
  }
  // #endregion
}
