/**
 * @file WalletAggregateSnapshot.ts
 * @description Structure of standard aggregate snapshots for saving or restoring state.
 */

import { WalletState } from '../state/WalletState.js';
import { IBalance } from '../../shared/types/WalletTypes.js';

export interface WalletAggregateSnapshot {
  walletId: string;
  tenantId: string;
  organizationId: string;
  currency: string;
  status: WalletState;
  balances: IBalance;
  version: number;
  checksum: string;
  updatedAt: Date;
}
