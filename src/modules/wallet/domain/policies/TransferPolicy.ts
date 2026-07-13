/**
 * @file TransferPolicy.ts
 * @description Domain Business Policy governing Transfer operations.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export interface ITransferEvaluationParams {
  sourceWallet: IWalletData;
  destinationWallet: IWalletData;
  amount: number;
}

export class TransferPolicy implements IPolicy<ITransferEvaluationParams, boolean> {
  /**
   * Evaluates if a transfer is allowed between source and destination wallets.
   * "Escrow tidak dapat Transfer". Also checks status of wallets.
   */
  public evaluate(params: ITransferEvaluationParams): boolean {
    const { sourceWallet, destinationWallet, amount } = params;

    // Escrow cannot transfer
    if (sourceWallet.status === WalletStatus.ESCROW) {
      return false;
    }

    // Closed, archived, or suspended wallets cannot transfer
    const terminalStatuses = [WalletStatus.CLOSED, WalletStatus.ARCHIVED, WalletStatus.SUSPENDED];
    if (terminalStatuses.includes(sourceWallet.status) || terminalStatuses.includes(destinationWallet.status)) {
      return false;
    }

    // Source must have sufficient fluid balance
    const sourceFluid = sourceWallet.balances.availableBalance - sourceWallet.balances.frozenBalance - sourceWallet.balances.escrowBalance;
    if (sourceFluid < amount) {
      return false;
    }

    return true;
  }
}
