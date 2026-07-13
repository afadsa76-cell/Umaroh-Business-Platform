/**
 * @file AuditLogger.ts
 * @description Logger for user-authored and accounting state changes.
 * @responsibility Persist and report historical transaction edits and maker-checker audit trials.
 * 
 * TODO: Integrate direct writing to read-only security channels.
 */

import { ILogger } from '../../domain/interfaces/ILogger.js';

export class AuditLogger implements ILogger {
  private readonly tracerContext: unknown;

  /**
   * @constructor
   * @param tracerContext - Injected context for logging outputs (e.g. Winston).
   */
  constructor(tracerContext: unknown) {
    this.tracerContext = tracerContext;
  }

  // #region Methods
  public info(message: string, context?: unknown): void {
    console.log(this.tracerContext, message, context);
  }

  public warn(message: string, context?: unknown): void {
    console.warn(message, context);
  }

  public error(message: string, context?: unknown): void {
    console.error(message, context);
  }
  // #endregion
}
