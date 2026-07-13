/**
 * @file ValidationPipeline.ts
 * @description Pipeline orchestrator implementing ordered sequential stages, parallel rule execution, short-circuit, and telemetry.
 */

import { IValidationPipeline, ValidationResult, ValidationReport } from './IValidationPipeline.js';
import { ValidationContext, ValidationStage } from './ValidationContext.js';
import { IValidationRule } from './IValidationRule.js';
import { ValidationMetrics } from './ValidationMetrics.js';

export class ValidationPipeline implements IValidationPipeline {
  private rules: IValidationRule[] = [];
  private readonly metrics = ValidationMetrics.getInstance();

  /**
   * Registers a validation rule into the pipeline.
   */
  public registerRule(rule: IValidationRule): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * Executes the pipeline over the given context.
   * Runs sequentially across stages and in parallel across rules inside each stage.
   */
  public async execute(context: ValidationContext): Promise<ValidationResult> {
    const startTime = Date.now();
    this.metrics.increment('validation.count');

    // Ordered sequence of stages as defined in specifications
    const orderedStages = [
      ValidationStage.REQUEST_STRUCTURE,
      ValidationStage.AUTHENTICATION,
      ValidationStage.AUTHORIZATION,
      ValidationStage.PERMISSION,
      ValidationStage.WALLET_EXISTS,
      ValidationStage.WALLET_STATE,
      ValidationStage.CURRENCY,
      ValidationStage.LIMIT,
      ValidationStage.VERSION,
      ValidationStage.IDEMPOTENCY,
      ValidationStage.RISK,
      ValidationStage.BUSINESS_POLICY
    ];

    try {
      for (const stage of orderedStages) {
        // If context has been short-circuited or contains severe errors, halt downstream stages
        if (context.shortCircuit || context.hasErrors('ERROR') || context.hasErrors('CRITICAL')) {
          console.warn(`[ValidationPipeline] Short-circuit triggered at stage ${stage}. Terminating pipeline.`);
          break;
        }

        const stageRules = this.rules.filter(rule => rule.stage === stage);
        if (stageRules.length === 0) {
          context.stagesPassed.push(stage);
          continue;
        }

        console.log(`[ValidationPipeline] Executing Stage: ${stage} (${stageRules.length} rules) in parallel...`);

        // Execute all rules of the current stage in parallel (Aggregated Error Collection)
        await Promise.all(
          stageRules.map(async (rule) => {
            try {
              const ruleStart = Date.now();
              await rule.validate(context);
              const ruleDuration = Date.now() - ruleStart;
              console.log(`[ValidationRule Success] Rule ${rule.name} in Stage ${stage} took ${ruleDuration}ms`);
            } catch (ruleErr: unknown) {
              const message = ruleErr instanceof Error ? ruleErr.message : String(ruleErr);
              context.addError(stage, rule.name, message, 'ERROR');
              this.metrics.increment('validation.failure');
              console.error(`[ValidationRule Failed] Rule ${rule.name} in Stage ${stage} failed: ${message}`);
            }
          })
        );

        // If no severe errors occurred in this stage, mark it as passed
        if (!context.hasErrors('ERROR') && !context.hasErrors('CRITICAL')) {
          context.stagesPassed.push(stage);
        }
      }

      const duration = Date.now() - startTime;
      this.metrics.recordDuration(duration);

      const hasSevereErrors = context.hasErrors('ERROR') || context.hasErrors('CRITICAL');
      if (hasSevereErrors) {
        this.metrics.increment('validation.failure');
        return {
          success: false,
          errors: context.errors.map(e => ({
            stage: e.stage,
            rule: e.rule,
            message: e.message,
            severity: e.severity
          }))
        };
      }

      this.metrics.increment('validation.success');
      context.stagesPassed.push(ValidationStage.READY_FOR_TX);
      return {
        success: true,
        errors: []
      };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      context.addError(ValidationStage.REQUEST_STRUCTURE, 'PipelineExecutionError', message, 'CRITICAL');
      this.metrics.increment('validation.failure');
      return {
        success: false,
        errors: [{
          stage: 'Pipeline',
          rule: 'Orchestration',
          message,
          severity: 'CRITICAL'
        }]
      };
    }
  }

  /**
   * Generates a detailed validation report of the execution.
   */
  public generateReport(context: ValidationContext): ValidationReport {
    const durationMs = Date.now() - context.startTime.getTime();
    return {
      requestId: context.requestId,
      timestamp: context.startTime,
      durationMs,
      success: !context.hasErrors('ERROR') && !context.hasErrors('CRITICAL'),
      stagesPassed: context.stagesPassed,
      errors: context.errors.map(e => ({
        stage: e.stage,
        rule: e.rule,
        message: e.message,
        severity: e.severity
      }))
    };
  }
}
