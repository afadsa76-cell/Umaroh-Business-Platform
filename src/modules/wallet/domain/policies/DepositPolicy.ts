/**
 * @file DepositPolicy.ts
 * @description Domain Business Policy governing Deposit operations.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class DepositPolicy implements IPolicy<IWalletData, boolean> {
  /**
   * Evaluates if a deposit operation is allowed on the wallet.
   * Frozen and closed/archived/suspended wallets cannot receive deposits.
   */
  public evaluate(wallet: IWalletData): boolean {
    if (wallet.status === WalletStatus.FROZEN) {
      return false;
    }
    if (wallet.status === WalletStatus.CLOSED || wallet.status === WalletStatus.ARCHIVED || wallet.status === WalletStatus.SUSPENDED) {
      return false;
    }
    return true;
  }
}
