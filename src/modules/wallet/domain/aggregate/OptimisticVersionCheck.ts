/**
 * @file OptimisticVersionCheck.ts
 * @description In-memory concurrency guard validating expected vs actual aggregate versions.
 */

import { AggregateVersion } from './AggregateVersion.js';
import { AggregateConflictException } from '../exceptions/AggregateConflictException.js';

export class OptimisticVersionCheck {
  public static check(current: AggregateVersion, expected: AggregateVersion): void {
    if (!current.equals(expected)) {
      throw new AggregateConflictException(
        `Optimistic Concurrency Conflict: Expected version ${expected.getRawValue()} but current is ${current.getRawValue()}.`
      );
    }
  }
}
