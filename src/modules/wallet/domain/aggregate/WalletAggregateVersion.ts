/**
 * @file WalletAggregateVersion.ts
 * @description Specialized monotonic version wrapper for the Wallet aggregate root.
 */

import { AggregateVersion } from './AggregateVersion.js';

export class WalletAggregateVersion extends AggregateVersion {
  public static from(value: number): WalletAggregateVersion {
    return new WalletAggregateVersion(value);
  }
}
