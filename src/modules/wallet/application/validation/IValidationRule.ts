/**
 * @file IValidationRule.ts
 * @description Port boundary for modular, isolated, and highly cohesive validation rule definitions.
 */

import { ValidationContext, ValidationStage } from './ValidationContext.js';

export interface IValidationRule {
  /**
   * Unique descriptive name of the validation rule.
   */
  readonly name: string;

  /**
   * The logical engine pipeline stage this rule belongs to.
   */
  readonly stage: ValidationStage;

  /**
   * Executes the validation rule against the provided context.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
