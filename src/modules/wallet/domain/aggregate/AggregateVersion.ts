/**
 * @file AggregateVersion.ts
 * @description Monotonically increasing version value object for optimistic concurrency control.
 */

import { AggregateVersionException } from '../exceptions/AggregateVersionException.js';

export class AggregateVersion {
  private readonly value: number;

  protected constructor(value: number) {
    if (value < 0) {
      throw new AggregateVersionException('Version value cannot be negative.');
    }
    this.value = value;
  }

  public static from(value: number): AggregateVersion {
    return new AggregateVersion(value);
  }

  public getRawValue(): number {
    return this.value;
  }

  public next(): AggregateVersion {
    return new AggregateVersion(this.value + 1);
  }

  public equals(other: AggregateVersion): boolean {
    return this.value === other.getRawValue();
  }

  public isLessThan(other: AggregateVersion): boolean {
    return this.value < other.getRawValue();
  }
}
