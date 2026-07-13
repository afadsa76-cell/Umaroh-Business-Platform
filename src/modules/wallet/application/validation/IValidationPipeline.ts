/**
 * @file IValidationPipeline.ts
 * @description Contract for the validation and policy orchestration pipeline.
 */

import { ValidationContext } from './ValidationContext.js';
import { IValidationRule } from './IValidationRule.js';

export interface ValidationResult {
  success: boolean;
  errors: Array<{
    stage: string;
    rule: string;
    message: string;
    severity: string;
  }>;
}

export interface ValidationReport {
  requestId: string;
  timestamp: Date;
  durationMs: number;
  success: boolean;
  stagesPassed: string[];
  errors: Array<{
    stage: string;
    rule: string;
    message: string;
    severity: string;
  }>;
}

export interface IValidationPipeline {
  /**
   * Registers a validation rule into the pipeline.
   */
  registerRule(rule: IValidationRule): this;

  /**
   * Executes the pipeline over the given context.
   */
  execute(context: ValidationContext): Promise<ValidationResult>;

  /**
   * Generates a detailed validation report of the execution.
   */
  generateReport(context: ValidationContext): ValidationReport;
}
