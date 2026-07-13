/**
 * @file BusinessLogger.ts
 * @description Logger for general transactional movements, transfers, and wallet states.
 * @responsibility Log operational bookkeeping trails and activity states.
 * 
 * TODO: Support automated cloud logging trace attachments.
 */

import { ILogger } from '../../domain/interfaces/ILogger.js';

export class BusinessLogger implements ILogger {
  private readonly loggingContext: unknown;

  /**
   * @constructor
   * @param loggingContext - Injected log output context.
   */
  constructor(loggingContext: unknown) {
    this.loggingContext = loggingContext;
  }

  // #region Methods
  public info(message: string, context?: unknown): void {
    console.log(this.loggingContext, message, context);
  }

  public warn(message: string, context?: unknown): void {
    console.warn(message, context);
  }

  public error(message: string, context?: unknown): void {
    console.error(message, context);
  }
  // #endregion
}
