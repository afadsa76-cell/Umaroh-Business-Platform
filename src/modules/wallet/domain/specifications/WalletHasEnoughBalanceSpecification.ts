/**
 * @file WalletHasEnoughBalanceSpecification.ts
 * @description Domain specification verifying if a wallet has sufficient available balance.
 */

import { ISpecification } from './ISpecification.js';
import { IWalletData } from '../../shared/types/WalletTypes.js';

export interface IBalanceContext {
  amount: number;
}

export class WalletHasEnoughBalanceSpecification implements ISpecification<IWalletData, IBalanceContext> {
  public isSatisfiedBy(wallet: IWalletData, context?: IBalanceContext): boolean {
    if (!context || context.amount <= 0) return true;
    
    // Deduct frozen and escrow balances to get the absolute fluid available balance
    const fluidBalance = wallet.balances.availableBalance - wallet.balances.frozenBalance - wallet.balances.escrowBalance;
    return fluidBalance >= context.amount;
  }
}
