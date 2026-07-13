/**
 * @file WalletIdempotencySpecification.ts
 * @description Domain specification verifying if an idempotency key is fresh and has not been used.
 */

import { ISpecification } from './ISpecification.js';

export class WalletIdempotencySpecification implements ISpecification<string, Set<string> | string[]> {
  public isSatisfiedBy(key: string, usedKeys?: Set<string> | string[]): boolean {
    if (!key || !usedKeys) return true;
    if (usedKeys instanceof Set) {
      return !usedKeys.has(key);
    }
    return !usedKeys.includes(key);
  }
}
