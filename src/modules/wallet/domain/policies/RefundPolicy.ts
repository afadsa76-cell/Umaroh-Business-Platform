/**
 * @file RefundPolicy.ts
 * @description Domain Business Policy governing Refund operations.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class RefundPolicy implements IPolicy<IWalletData, boolean> {
  /**
   * Evaluates if a wallet can receive a refund.
   * Wallet must not be CLOSED or ARCHIVED.
   */
  public evaluate(wallet: IWalletData): boolean {
    return wallet.status !== WalletStatus.CLOSED && wallet.status !== WalletStatus.ARCHIVED;
  }
}
