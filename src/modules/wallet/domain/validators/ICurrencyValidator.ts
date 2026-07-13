/**
 * @file ICurrencyValidator.ts
 * @description Boundary interface for ISO-4217 currency checks and matching validations.
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface ICurrencyValidator {
  /**
   * Validates if request currency is a valid ISO-4217 code and matches the target wallets.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
