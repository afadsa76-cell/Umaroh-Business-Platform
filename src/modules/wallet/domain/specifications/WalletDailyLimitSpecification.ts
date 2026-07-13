/**
 * @file WalletDailyLimitSpecification.ts
 * @description Domain specification verifying if a transaction fits within the daily velocity limits.
 */

import { ISpecification } from './ISpecification.js';

export interface IDailyLimitContext {
  dailyAccumulated: number;
  dailyLimit: number;
}

export class WalletDailyLimitSpecification implements ISpecification<number, IDailyLimitContext> {
  public isSatisfiedBy(amount: number, context?: IDailyLimitContext): boolean {
    if (!context) return true;
    return (context.dailyAccumulated + amount) <= context.dailyLimit;
  }
}
