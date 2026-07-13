/**
 * @file WalletRequestValidator.ts
 * @description Validator class implementing IValidationRule to enforce initial request structural integrity, positive amounts, and decimal precision.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';

export class WalletRequestValidator implements IValidationRule {
  public readonly name = 'WalletRequestValidator';
  public readonly stage = ValidationStage.REQUEST_STRUCTURE;

  /**
   * Validates structural integrity, positive amount, and decimal precision of the request.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;

    // 1. Validate operational type
    const validOperations = [
      'DEPOSIT', 'WITHDRAW', 'TRANSFER', 'FREEZE', 'RESERVE', 'SETTLEMENT', 'COMMISSION', 'REFUND', 'ADJUSTMENT'
    ];
    if (!req.operationType || !validOperations.includes(req.operationType)) {
      context.addError(
        this.stage,
        this.name,
        `Invalid or missing operation type: ${req.operationType}`,
        'CRITICAL'
      );
      context.shortCircuit = true;
      return;
    }

    // 2. Validate essential identifiers based on operation
    if (req.operationType === 'TRANSFER') {
      if (!req.sourceUid || !req.destinationUid) {
        context.addError(
          this.stage,
          this.name,
          'Transfer operation requires both sourceUid and destinationUid.',
          'CRITICAL'
        );
        context.shortCircuit = true;
      }
      if (req.sourceUid === req.destinationUid) {
        context.addError(
          this.stage,
          this.name,
          'Source wallet and destination wallet must be different.',
          'ERROR'
        );
      }
    } else {
      // Deposit, withdraw, etc. require at least a uid or sourceUid
      const targetUid = req.uid || req.sourceUid;
      if (!targetUid) {
        context.addError(
          this.stage,
          this.name,
          `Operation ${req.operationType} requires a target wallet UID.`,
          'CRITICAL'
        );
        context.shortCircuit = true;
      }
    }

    // 3. Positive Amount and numerical checks
    if (typeof req.amount !== 'number' || isNaN(req.amount)) {
      context.addError(
        this.stage,
        this.name,
        'Transaction amount must be a valid number.',
        'CRITICAL'
      );
      context.shortCircuit = true;
      return;
    }

    if (req.amount <= 0) {
      context.addError(
        this.stage,
        this.name,
        `Transaction amount must be strictly positive. Received: ${req.amount}`,
        'ERROR'
      );
    }

    // 4. Decimal precision limit check (Maximum 4 decimal places)
    const amountStr = String(req.amount);
    const decimalIndex = amountStr.indexOf('.');
    if (decimalIndex >= 0) {
      const decimals = amountStr.length - decimalIndex - 1;
      if (decimals > 4) {
        context.addError(
          this.stage,
          this.name,
          `Transaction amount precision exceeds maximum of 4 decimal places. Received: ${decimals} decimals`,
          'ERROR'
        );
      }
    }

    // 5. Check presence of other standard fields
    if (!req.currency || req.currency.trim().length !== 3) {
      context.addError(
        this.stage,
        this.name,
        `Missing or invalid currency. Expected 3-letter ISO-4217 code, received: ${req.currency}`,
        'ERROR'
      );
    }

    if (!req.referenceNumber || req.referenceNumber.trim().length === 0) {
      context.addError(
        this.stage,
        this.name,
        'Missing reference number.',
        'ERROR'
      );
    }

    if (!req.idempotencyKey || req.idempotencyKey.trim().length === 0) {
      context.addError(
        this.stage,
        this.name,
        'Missing idempotency key.',
        'ERROR'
      );
    }
  }
}
