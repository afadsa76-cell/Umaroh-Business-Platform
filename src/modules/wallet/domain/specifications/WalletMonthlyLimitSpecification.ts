/**
 * @file WalletMonthlyLimitSpecification.ts
 * @description Domain specification verifying if a transaction fits within the monthly velocity limits.
 */

import { ISpecification } from './ISpecification.js';

export interface IMonthlyLimitContext {
  monthlyAccumulated: number;
  monthlyLimit: number;
}

export class WalletMonthlyLimitSpecification implements ISpecification<number, IMonthlyLimitContext> {
  public isSatisfiedBy(amount: number, context?: IMonthlyLimitContext): boolean {
    if (!context) return true;
    return (context.monthlyAccumulated + amount) <= context.monthlyLimit;
  }
}
