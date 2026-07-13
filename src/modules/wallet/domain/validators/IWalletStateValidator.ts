/**
 * @file IWalletStateValidator.ts
 * @description Boundary interface for checking wallet lifecycle status constraints (frozen, suspended, closed).
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface IWalletStateValidator {
  /**
   * Validates if the wallet is in an appropriate status (e.g. Active, Pending) to accept the requested operation.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
