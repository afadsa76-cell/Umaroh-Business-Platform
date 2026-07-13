/**
 * @file IIdempotencyValidator.ts
 * @description Boundary interface for checking idempotency keys and detecting replay attacks or duplicate submissions.
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface IIdempotencyValidator {
  /**
   * Validates if the transaction has already been executed or is currently in progress.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
