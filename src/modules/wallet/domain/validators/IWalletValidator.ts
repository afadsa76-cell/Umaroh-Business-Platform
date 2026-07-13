/**
 * @file IWalletValidator.ts
 * @description Boundary interface for Wallet structure and existence validation.
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface IWalletValidator {
  /**
   * Validates wallet structure, presence, and structural constraints.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
