/**
 * @file WalletLimitSpecification.ts
 * @description Domain specification verifying if a transaction amount is within individual transaction limits.
 */

import { ISpecification } from './ISpecification.js';

export interface ILimitBounds {
  maxAmount: number;
  minAmount: number;
}

export class WalletLimitSpecification implements ISpecification<number, ILimitBounds> {
  public isSatisfiedBy(amount: number, bounds?: ILimitBounds): boolean {
    if (!bounds) return true;
    return amount >= bounds.minAmount && amount <= bounds.maxAmount;
  }
}
