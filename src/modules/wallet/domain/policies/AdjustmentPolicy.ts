/**
 * @file AdjustmentPolicy.ts
 * @description Domain Business Policy governing Adjustment operations.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class AdjustmentPolicy implements IPolicy<IWalletData, boolean> {
  /**
   * Evaluates if a wallet can undergo an adjustment.
   * Closed or archived wallets cannot accept adjustments.
   */
  public evaluate(wallet: IWalletData): boolean {
    return wallet.status !== WalletStatus.CLOSED && wallet.status !== WalletStatus.ARCHIVED;
  }
}
