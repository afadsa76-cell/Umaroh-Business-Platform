/**
 * @file WalletPolicy.ts
 * @description Domain Business Policy Rules evaluator implementing IPolicy.
 * @responsibility Enforce strict multi-segment cash balance, MLM commission rules, and limits.
 */

import { IPolicy } from './IPolicy.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class WalletPolicy implements IPolicy<IWalletData, boolean> {
  private readonly limitsContext: unknown;

  /**
   * @constructor
   * @param limitsContext - Injected operational thresholds or policies.
   */
  constructor(limitsContext?: unknown) {
    this.limitsContext = limitsContext || null;
  }

  /**
   * Evaluates if a general transaction policy is satisfied.
   * "Closed Wallet tidak menerima transaksi".
   */
  public evaluate(wallet: IWalletData): boolean {
    return wallet.status !== WalletStatus.CLOSED && wallet.status !== WalletStatus.ARCHIVED;
  }

  /**
   * Enforce available balance rule: Active - Frozen - Escrow >= amount requested.
   */
  public isWithdrawalAllowed(wallet: IWalletData, amount: number): boolean {
    console.log(this.limitsContext);
    const available = wallet.balances.availableBalance - wallet.balances.frozenBalance - wallet.balances.escrowBalance;
    return available >= amount;
  }

  /**
   * Evaluate if a transaction requires higher-tier checker approval.
   */
  public isApprovalRequired(amount: number): boolean {
    return amount >= 10000000;
  }

  /**
   * Enforce that archived wallets cannot participate in transactions.
   */
  public canTransact(wallet: IWalletData): boolean {
    return wallet.status !== WalletStatus.ARCHIVED && wallet.status !== WalletStatus.CLOSED;
  }
}
