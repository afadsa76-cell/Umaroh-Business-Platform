/**
 * @file ReferenceValidator.ts
 * @description Validator class checking if reference numbers are validly formatted, non-empty, and satisfy minimum length and complexity.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';

export class ReferenceValidator implements IValidationRule {
  public readonly name = 'ReferenceValidator';
  public readonly stage = ValidationStage.REQUEST_STRUCTURE;

  /**
   * Validates reference number structure and formats.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;
    const ref = req.referenceNumber;

    if (!ref) {
      context.addError(
        this.stage,
        this.name,
        'Reference number is missing.',
        'ERROR'
      );
      return;
    }

    // 1. Minimum length of 8 characters for financial safety
    if (ref.trim().length < 8) {
      context.addError(
        this.stage,
        this.name,
        `Reference number '${ref}' is too short (must be at least 8 characters).`,
        'ERROR'
      );
    }

    // 2. Alphanumeric complexity regex check (letters, numbers, hyphens, and underscores)
    const refPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!refPattern.test(ref)) {
      context.addError(
        this.stage,
        this.name,
        `Reference number '${ref}' contains forbidden characters. Only alphanumeric characters, hyphens (-), and underscores (_) are allowed.`,
        'ERROR'
      );
    }
  }
}
