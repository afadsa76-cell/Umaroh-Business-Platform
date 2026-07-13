/**
 * @file SettlementPolicy.ts
 * @description Domain Business Policy governing Settlement operations.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class SettlementPolicy implements IPolicy<IWalletData, boolean> {
  /**
   * Evaluates if a wallet is allowed to execute a settlement.
   * "Pending tidak dapat Settlement". Closed, suspended, or archived wallets are also blocked.
   */
  public evaluate(wallet: IWalletData): boolean {
    if (wallet.status === WalletStatus.PENDING) {
      return false;
    }
    const blockedStatuses = [WalletStatus.CLOSED, WalletStatus.ARCHIVED, WalletStatus.SUSPENDED];
    if (blockedStatuses.includes(wallet.status)) {
      return false;
    }
    return true;
  }
}
