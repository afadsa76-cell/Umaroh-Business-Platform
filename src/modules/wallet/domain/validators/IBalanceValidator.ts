/**
 * @file IBalanceValidator.ts
 * @description Boundary interface for financial balance validations (available, escrow, pending, and segment limits).
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface IBalanceValidator {
  /**
   * Validates if the wallet has enough funds for the operation, taking segment restrictions into account.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
