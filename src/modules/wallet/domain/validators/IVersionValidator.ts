/**
 * @file IVersionValidator.ts
 * @description Boundary interface for optimistic concurrency version matching.
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface IVersionValidator {
  /**
   * Validates if the client-submitted version matches the stored wallet checksum/timestamp.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
