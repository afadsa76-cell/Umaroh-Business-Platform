/**
 * @file WalletLimitValidator.ts
 * @description Validator class checking if transactions comply with individual bounds and daily/monthly aggregated limits.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { ILimitValidator } from './ILimitValidator.js';
import { WalletLimitSpecification } from '../specifications/WalletLimitSpecification.js';
import { WalletDailyLimitSpecification } from '../specifications/WalletDailyLimitSpecification.js';
import { WalletMonthlyLimitSpecification } from '../specifications/WalletMonthlyLimitSpecification.js';

export class WalletLimitValidator implements ILimitValidator, IValidationRule {
  public readonly name = 'WalletLimitValidator';
  public readonly stage = ValidationStage.LIMIT;

  private readonly limitSpec = new WalletLimitSpecification();
  private readonly dailyLimitSpec = new WalletDailyLimitSpecification();
  private readonly monthlyLimitSpec = new WalletMonthlyLimitSpecification();

  /**
   * Validates single transaction bounds and daily/monthly velocity limits.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;
    const amount = req.amount;

    // 1. Single Transaction Bounds Check
    // Default Limits: Min: 1000, Max: 100,000,000 (e.g., IDR or USD equivalent)
    const bounds = {
      minAmount: context.getMetadata<number>('minTransactionLimit') ?? 1000,
      maxAmount: context.getMetadata<number>('maxTransactionLimit') ?? 100000000
    };

    if (!this.limitSpec.isSatisfiedBy(amount, bounds)) {
      context.addError(
        this.stage,
        this.name,
        `Transaction amount ${amount} is outside individual boundaries. Allowed Min: ${bounds.minAmount}, Max: ${bounds.maxAmount}`,
        'ERROR'
      );
      return;
    }

    // 2. Daily Velocity Limit Check
    // We check context metadata, fallback to defaults
    const dailyAccumulated = context.getMetadata<number>('dailyAccumulatedTotal') ?? 5000000; // 5 million IDR/cents default
    const dailyLimit = context.getMetadata<number>('dailyLimit') ?? 50000000; // 50 million IDR/cents default

    if (!this.dailyLimitSpec.isSatisfiedBy(amount, { dailyAccumulated, dailyLimit })) {
      context.addError(
        this.stage,
        this.name,
        `Daily Limit Exceeded: Adding ${amount} to daily total ${dailyAccumulated} exceeds daily limit of ${dailyLimit}.`,
        'ERROR'
      );
    }

    // 3. Monthly Velocity Limit Check
    const monthlyAccumulated = context.getMetadata<number>('monthlyAccumulatedTotal') ?? 25000000; // 25 million default
    const monthlyLimit = context.getMetadata<number>('monthlyLimit') ?? 200000000; // 200 million default

    if (!this.monthlyLimitSpec.isSatisfiedBy(amount, { monthlyAccumulated, monthlyLimit })) {
      context.addError(
        this.stage,
        this.name,
        `Monthly Limit Exceeded: Adding ${amount} to monthly total ${monthlyAccumulated} exceeds monthly limit of ${monthlyLimit}.`,
        'ERROR'
      );
    }
  }
}
