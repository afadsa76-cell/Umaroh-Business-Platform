/**
 * @file WalletAggregateRepository.ts
 * @description Outward repository port defining read and write requirements for WalletAggregate.
 */

import { WalletAggregate } from './WalletAggregate.js';

export interface WalletAggregateRepository {
  findById(id: string): Promise<WalletAggregate | null>;
  save(aggregate: WalletAggregate): Promise<void>;
}
