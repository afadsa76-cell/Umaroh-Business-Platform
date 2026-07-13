/**
 * @file ReservePolicy.ts
 * @description Domain Business Policy governing Reserve operations.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export interface IReserveEvaluationParams {
  wallet: IWalletData;
  amount: number;
}

export class ReservePolicy implements IPolicy<IReserveEvaluationParams, boolean> {
  /**
   * Evaluates if a wallet can reserve/escrow a given amount.
   * Wallet must be ACTIVE or ESCROW and have sufficient fluid available balance.
   */
  public evaluate(params: IReserveEvaluationParams): boolean {
    const { wallet, amount } = params;

    if (wallet.status !== WalletStatus.ACTIVE && wallet.status !== WalletStatus.ESCROW) {
      return false;
    }

    const fluidAvailable = wallet.balances.availableBalance - wallet.balances.frozenBalance - wallet.balances.escrowBalance;
    return fluidAvailable >= amount;
  }
}
