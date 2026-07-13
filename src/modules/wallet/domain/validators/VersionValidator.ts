/**
 * @file VersionValidator.ts
 * @description Validator class enforcing optimistic concurrency checking using wallet checksums or update timestamps.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { IVersionValidator } from './IVersionValidator.js';
import { WalletVersionSpecification } from '../specifications/WalletVersionSpecification.js';

export class VersionValidator implements IVersionValidator, IValidationRule {
  public readonly name = 'VersionValidator';
  public readonly stage = ValidationStage.VERSION;

  private readonly versionSpec = new WalletVersionSpecification();

  /**
   * Validates if the client-submitted version matches the stored wallet checksum/timestamp.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;

    // Concurrency check is only needed if version/checksum is submitted
    if (req.version === undefined) {
      return;
    }

    const uidsToCheck = [];
    if (req.operationType === 'TRANSFER') {
      if (req.sourceUid) uidsToCheck.push(req.sourceUid);
    } else {
      const targetUid = req.uid || req.sourceUid;
      if (targetUid) uidsToCheck.push(targetUid);
    }

    for (const uid of uidsToCheck) {
      const wallet = context.getWallet(uid);
      if (!wallet) continue;

      if (!this.versionSpec.isSatisfiedBy(wallet, req.version)) {
        context.addError(
          this.stage,
          this.name,
          `Optimistic Concurrency Conflict: The requested version ${req.version} for wallet ${uid} does not match the actual current version (checksum: ${wallet.checksum} or timestamp: ${wallet.updatedAt ? new Date(wallet.updatedAt).getTime() : 0}).`,
          'ERROR'
        );
      }
    }
  }
}
