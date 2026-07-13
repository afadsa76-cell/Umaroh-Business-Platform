/**
 * @file WithdrawPolicy.ts
 * @description Domain Business Policy governing Withdrawal operations.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export interface IWithdrawEvaluationParams {
  wallet: IWalletData;
  amount: number;
}

export class WithdrawPolicy implements IPolicy<IWithdrawEvaluationParams, boolean> {
  /**
   * Evaluates if a withdrawal is allowed.
   * Can only withdraw from Active wallets, using fluid available balance, and rewards cannot be withdrawn.
   */
  public evaluate(params: IWithdrawEvaluationParams): boolean {
    const { wallet, amount } = params;
    
    // Must be ACTIVE
    if (wallet.status !== WalletStatus.ACTIVE) {
      return false;
    }

    // Available balance minus frozen and escrow
    const fluidAvailable = wallet.balances.availableBalance - wallet.balances.frozenBalance - wallet.balances.escrowBalance;
    
    // Subtract rewardBalance to satisfy: "Reward tidak dapat Withdraw"
    const withdrawable = fluidAvailable - wallet.balances.rewardBalance;

    return withdrawable >= amount;
  }
}
