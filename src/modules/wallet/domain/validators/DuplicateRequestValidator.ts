/**
 * @file DuplicateRequestValidator.ts
 * @description Validator class protecting against sliding-window "double-tap" submissions of identical transaction payloads.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';

interface ITransactionSignature {
  signature: string;
  timestamp: number;
}

// In-memory cache of transaction signatures processed within the last 5 seconds
let processedSignatures: ITransactionSignature[] = [];

export class DuplicateRequestValidator implements IValidationRule {
  public readonly name = 'DuplicateRequestValidator';
  public readonly stage = ValidationStage.IDEMPOTENCY;

  /**
   * Validates if an identical transaction payload is being rapidly submitted.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;
    const now = Date.now();

    // Clean up cached signatures older than 5 seconds
    processedSignatures = processedSignatures.filter(sig => sig.timestamp > now - 5000);

    // Create a deterministic unique hash/signature of the transaction parameters
    const targetUid = req.uid || req.sourceUid || '';
    const destUid = req.destinationUid || '';
    const payloadSignature = `${req.operationType}:${targetUid}:${destUid}:${req.amount}:${req.currency}:${req.referenceNumber}`;

    // Check if a matching signature was processed within the sliding window
    const duplicate = processedSignatures.find(sig => sig.signature === payloadSignature);
    if (duplicate) {
      context.addError(
        this.stage,
        this.name,
        `Double-tap Submission Rejected: An identical transaction has already been submitted in the last ${Math.round((now - duplicate.timestamp) / 100) / 10} seconds.`,
        'CRITICAL'
      );
      context.shortCircuit = true;
      return;
    }

    // Cache the signature of the current valid transaction
    processedSignatures.push({
      signature: payloadSignature,
      timestamp: now
    });
  }
}
