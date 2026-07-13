/**
 * @file IRiskValidator.ts
 * @description Boundary interface for fraud detection, risk scoring, and velocity rate check validations.
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface IRiskValidator {
  /**
   * Validates velocity limits, checks client metadata, and invokes fraud detection rules.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
