/**
 * @file BalanceValidator.ts
 * @description Validator class checking if wallets have sufficient fluid available balance for outflows.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { IBalanceValidator } from './IBalanceValidator.js';
import { WalletHasEnoughBalanceSpecification } from '../specifications/WalletHasEnoughBalanceSpecification.js';

export class BalanceValidator implements IBalanceValidator, IValidationRule {
  public readonly name = 'BalanceValidator';
  public readonly stage = ValidationStage.LIMIT; // Runs alongside limits checks
  
  private readonly balanceSpec = new WalletHasEnoughBalanceSpecification();

  /**
   * Validates if the transacting wallets have enough balance for outflows.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;

    // Balance checks are only required for operations that deduct funds
    const isOutflow = ['WITHDRAW', 'TRANSFER', 'RESERVE'].includes(req.operationType);
    if (!isOutflow) {
      return;
    }

    const sourceUid = req.sourceUid || req.uid;
    if (!sourceUid) return;

    const sourceWallet = context.getWallet(sourceUid);
    if (!sourceWallet) return;

    // Check if enough available balance exists
    if (!this.balanceSpec.isSatisfiedBy(sourceWallet, { amount: req.amount })) {
      context.addError(
        this.stage,
        this.name,
        `Insufficient available balance in wallet ${sourceUid}. Required: ${req.amount}, Available Segment: ${sourceWallet.balances.availableBalance}, Frozen Segment: ${sourceWallet.balances.frozenBalance}, Escrow Segment: ${sourceWallet.balances.escrowBalance}`,
        'ERROR'
      );
      return;
    }

    // Additional "Reward tidak dapat Withdraw" validation
    if (req.operationType === 'WITHDRAW') {
      const fluidAvailable = sourceWallet.balances.availableBalance - sourceWallet.balances.frozenBalance - sourceWallet.balances.escrowBalance;
      const withdrawable = fluidAvailable - sourceWallet.balances.rewardBalance;
      if (withdrawable < req.amount) {
        context.addError(
          this.stage,
          this.name,
          `Withdrawal Denied: Reward balance segment cannot be withdrawn. Attempted: ${req.amount}, Withdrawable (excl. rewards): ${withdrawable}`,
          'ERROR'
        );
      }
    }
  }
}
