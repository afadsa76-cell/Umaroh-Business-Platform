/**
 * @file BusinessPolicyValidator.ts
 * @description Validator class implementing IValidationRule to map and evaluate core domain policies based on transaction type.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { DepositPolicy } from '../policies/DepositPolicy.js';
import { WithdrawPolicy } from '../policies/WithdrawPolicy.js';
import { TransferPolicy } from '../policies/TransferPolicy.js';
import { FreezePolicy } from '../policies/FreezePolicy.js';
import { ReservePolicy } from '../policies/ReservePolicy.js';
import { SettlementPolicy } from '../policies/SettlementPolicy.js';
import { CommissionPolicy } from '../policies/CommissionPolicy.js';
import { RefundPolicy } from '../policies/RefundPolicy.js';
import { AdjustmentPolicy } from '../policies/AdjustmentPolicy.js';
import { ValidationMetrics } from '../../application/validation/ValidationMetrics.js';

export class BusinessPolicyValidator implements IValidationRule {
  public readonly name = 'BusinessPolicyValidator';
  public readonly stage = ValidationStage.BUSINESS_POLICY;

  private readonly depositPolicy = new DepositPolicy();
  private readonly withdrawPolicy = new WithdrawPolicy();
  private readonly transferPolicy = new TransferPolicy();
  private readonly freezePolicy = new FreezePolicy();
  private readonly reservePolicy = new ReservePolicy();
  private readonly settlementPolicy = new SettlementPolicy();
  private readonly commissionPolicy = new CommissionPolicy();
  private readonly refundPolicy = new RefundPolicy();
  private readonly adjustmentPolicy = new AdjustmentPolicy();

  private readonly metrics = ValidationMetrics.getInstance();

  /**
   * Evaluates corresponding domain policies against transacting wallets.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;
    const targetUid = req.uid || req.sourceUid;
    const targetWallet = targetUid ? context.getWallet(targetUid) : undefined;

    let isPolicySatisfied = true;
    let reason = '';

    switch (req.operationType) {
      case 'DEPOSIT':
        if (targetWallet) {
          isPolicySatisfied = this.depositPolicy.evaluate(targetWallet);
          reason = 'Deposit is forbidden on frozen, closed, archived, or suspended wallets.';
        }
        break;

      case 'WITHDRAW':
        if (targetWallet) {
          isPolicySatisfied = this.withdrawPolicy.evaluate({ wallet: targetWallet, amount: req.amount });
          reason = 'Withdrawal is restricted to active wallets, cannot exceed available balance, and cannot use rewards.';
        }
        break;

      case 'TRANSFER': {
        const sourceWallet = req.sourceUid ? context.getWallet(req.sourceUid) : undefined;
        const destWallet = req.destinationUid ? context.getWallet(req.destinationUid) : undefined;
        if (sourceWallet && destWallet) {
          isPolicySatisfied = this.transferPolicy.evaluate({
            sourceWallet,
            destinationWallet: destWallet,
            amount: req.amount
          });
          reason = 'Transfer is denied. Source must not be an escrow wallet, both wallets must not be terminal, and source must have sufficient available funds.';
        }
        break;
      }

      case 'FREEZE':
        if (targetWallet) {
          isPolicySatisfied = this.freezePolicy.evaluate(targetWallet);
          reason = 'Freeze operation cannot be performed on closed or archived wallets.';
        }
        break;

      case 'RESERVE':
        if (targetWallet) {
          isPolicySatisfied = this.reservePolicy.evaluate({ wallet: targetWallet, amount: req.amount });
          reason = 'Reserve/escrow hold can only be set on active or escrow wallets with sufficient available funds.';
        }
        break;

      case 'SETTLEMENT':
        if (targetWallet) {
          isPolicySatisfied = this.settlementPolicy.evaluate(targetWallet);
          reason = 'Settlement cannot be performed on pending, closed, archived, or suspended wallets.';
        }
        break;

      case 'COMMISSION': {
        const isApproved = context.getMetadata<boolean>('commissionApproved') ?? (req.customClaims?.commissionApproved === true);
        isPolicySatisfied = this.commissionPolicy.evaluate({ approved: isApproved });
        reason = 'MLM Commission must be formally approved before processing.';
        break;
      }

      case 'REFUND':
        if (targetWallet) {
          isPolicySatisfied = this.refundPolicy.evaluate(targetWallet);
          reason = 'Refunds cannot be credited to closed or archived wallets.';
        }
        break;

      case 'ADJUSTMENT':
        if (targetWallet) {
          isPolicySatisfied = this.adjustmentPolicy.evaluate(targetWallet);
          reason = 'Ledger adjustments are blocked on closed or archived wallets.';
        }
        break;
    }

    if (!isPolicySatisfied) {
      this.metrics.increment('policy.violation');
      context.addError(
        this.stage,
        this.name,
        `Policy Violation Exception: Operation ${req.operationType} failed core domain policies. Reason: ${reason}`,
        'ERROR'
      );
    }
  }
}
