/**
 * @file FreezePolicy.ts
 * @description Domain Business Policy governing Freeze operations.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class FreezePolicy implements IPolicy<IWalletData, boolean> {
  /**
   * Evaluates if a wallet can be frozen.
   * Closed or archived wallets cannot be frozen or unfrozen.
   */
  public evaluate(wallet: IWalletData): boolean {
    return wallet.status !== WalletStatus.CLOSED && wallet.status !== WalletStatus.ARCHIVED;
  }
}
