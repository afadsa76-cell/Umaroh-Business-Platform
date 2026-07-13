/**
 * @file ILimitValidator.ts
 * @description Boundary interface for evaluating single-transaction, daily, and monthly limits.
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface ILimitValidator {
  /**
   * Validates if the operation fits within standard min/max thresholds as well as aggregated velocity boundaries.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
